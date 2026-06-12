document.addEventListener('DOMContentLoaded', async () => {
    if (!supabaseClient) {
        alert("Supabase not initialized. Set credentials in supabase-client.js");
        return;
    }

    // Check auth
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }
    
    document.getElementById('user-email').textContent = session.user.email;
    
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await supabaseClient.auth.signOut();
        window.location.href = 'index.html';
    });

    // Check if user is Admin
    const { data: roleData, error: roleError } = await supabaseClient
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .single();
        
    if (roleError || !roleData || roleData.role !== 'admin') {
        document.querySelector('.container.py-5').innerHTML = `
            <div class="alert border border-danger bg-dark rounded-4 text-center p-5 mt-5 shadow-lg">
                <i class="bi bi-shield-lock display-1 mb-3 d-block text-danger"></i>
                <h2 class="ai-font fw-bold text-light">Access Denied</h2>
                <p class="text-muted">Your node lacks the required clearance to access the Command Center. You must be granted 'admin' privileges in the database.</p>
                <a href="index.html" class="btn btn-outline-danger rounded-pill px-4 mt-3">Return to Mainframe</a>
            </div>
        `;
        return; // Stop execution
    }

    // CREATE OR UPDATE POST
    const form = document.getElementById('create-post-form');
    const msg = document.getElementById('post-msg');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const formTitle = document.getElementById('form-title');
    const submitBtn = document.getElementById('submit-post-btn');
    const saveDraftBtn = document.getElementById('save-draft-btn');
    
    // Initialize Quill
    const quill = new Quill('#editor-container', {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                ['blockquote', 'code-block'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                ['link', 'image'],
                ['clean']
            ]
        }
    });

    // Global variable to store current posts for easy editing
    let currentPosts = [];

    function resetForm() {
        form.reset();
        document.getElementById('post-id').value = '';
        document.getElementById('post-status').value = 'published';
        quill.root.innerHTML = '';
        formTitle.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Create Transmission';
        submitBtn.textContent = 'Publish to Network';
        cancelEditBtn.classList.add('d-none');
    }

    if(cancelEditBtn) cancelEditBtn.addEventListener('click', resetForm);
    
    if(saveDraftBtn) {
        saveDraftBtn.addEventListener('click', () => {
            document.getElementById('post-status').value = 'draft';
            form.dispatchEvent(new Event('submit'));
        });
    }
    
    submitBtn.addEventListener('click', () => {
        document.getElementById('post-status').value = 'published';
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.classList.add('d-none');
        
        const postId = document.getElementById('post-id').value;
        const postData = {
            title: document.getElementById('post-title').value,
            category: document.getElementById('post-category').value,
            image_url: document.getElementById('post-image').value,
            excerpt: document.getElementById('post-excerpt').value,
            content: quill.root.innerHTML,
            is_featured: document.getElementById('post-featured').checked,
            status: document.getElementById('post-status').value,
            author_id: session.user.id
        };
        
        let error;
        if (postId) {
            const res = await supabaseClient.from('articles').update(postData).eq('id', postId);
            error = res.error;
        } else {
            const res = await supabaseClient.from('articles').insert([postData]);
            error = res.error;
        }
        
        if (error) {
            alert('Error saving post: ' + error.message);
        } else {
            msg.textContent = postId ? 'Updated successfully.' : 'Published successfully.';
            msg.classList.remove('d-none');
            resetForm();
            loadPosts();
        }
    });

    // LOAD POSTS WITH PAGINATION
    let adminCurrentPage = 0;
    const adminPostsPerPage = 5;

    async function loadPosts() {
        const tbody = document.getElementById('admin-posts-table');
        const from = adminCurrentPage * adminPostsPerPage;
        const to = from + adminPostsPerPage - 1;
        
        const { data, error, count } = await supabaseClient
            .from('articles')
            .select('*', { count: 'exact' })
            .order('created_at', { ascending: false })
            .range(from, to);
            
        if (error) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-danger">Error: ${error.message}</td></tr>`;
            return;
        }
        
        currentPosts = data || [];
        
        if (currentPosts.length === 0 && adminCurrentPage > 0) {
            adminCurrentPage--;
            loadPosts();
            return;
        }
        
        if (currentPosts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No transmissions found in the database.</td></tr>`;
            document.getElementById('admin-prev-btn').classList.add('d-none');
            document.getElementById('admin-next-btn').classList.add('d-none');
            document.getElementById('admin-page-info').textContent = '';
            return;
        }
        
        tbody.innerHTML = '';
        currentPosts.forEach(post => {
            const date = new Date(post.created_at).toLocaleDateString();
            const starIcon = post.is_featured ? '<i class="bi bi-star-fill text-warning"></i>' : '<i class="bi bi-star text-muted"></i>';
            const statusBadge = post.status === 'draft' ? '<span class="badge bg-warning text-dark">Draft</span>' : '<span class="badge bg-success">Published</span>';
            tbody.innerHTML += `
                <tr>
                    <td class="text-light fw-medium"><a href="post.html?id=${post.id}" class="text-light text-decoration-none">${post.title}</a></td>
                    <td>${statusBadge}</td>
                    <td class="text-muted small">${date}</td>
                    <td><span class="badge bg-secondary">${post.category}</span></td>
                    <td>${starIcon}</td>
                    <td>
                        <button class="btn btn-sm btn-outline-info edit-post rounded-pill me-1" data-id="${post.id}"><i class="bi bi-pencil"></i></button>
                        <button class="btn btn-sm btn-outline-danger delete-post rounded-pill" data-id="${post.id}"><i class="bi bi-trash"></i></button>
                    </td>
                </tr>
            `;
        });
        
        // Handle pagination UI
        const totalPages = Math.ceil(count / adminPostsPerPage);
        document.getElementById('admin-page-info').textContent = `Page ${adminCurrentPage + 1} of ${totalPages}`;
        
        const prevBtn = document.getElementById('admin-prev-btn');
        const nextBtn = document.getElementById('admin-next-btn');
        
        if (adminCurrentPage > 0) prevBtn.classList.remove('d-none');
        else prevBtn.classList.add('d-none');
        
        if (adminCurrentPage < totalPages - 1) nextBtn.classList.remove('d-none');
        else nextBtn.classList.add('d-none');
        
        document.querySelectorAll('.edit-post').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-id');
                const post = currentPosts.find(p => p.id === id);
                if(post) {
                    document.getElementById('post-id').value = post.id;
                    document.getElementById('post-title').value = post.title;
                    document.getElementById('post-category').value = post.category || 'LLMs & Chatbots';
                    document.getElementById('post-image').value = post.image_url || '';
                    document.getElementById('post-excerpt').value = post.excerpt;
                    quill.root.innerHTML = post.content || '';
                    document.getElementById('post-featured').checked = post.is_featured;
                    document.getElementById('post-status').value = post.status || 'published';
                    
                    formTitle.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Update Transmission';
                    submitBtn.textContent = 'Save Changes';
                    cancelEditBtn.classList.remove('d-none');
                    
                    if (typeof bootstrap !== 'undefined') {
                        const createTab = new bootstrap.Tab(document.getElementById('create-tab'));
                        createTab.show();
                    }
                    
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            });
        });

        document.querySelectorAll('.delete-post').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                if(confirm('Are you sure you want to permanently delete this transmission?')) {
                    const id = e.currentTarget.getAttribute('data-id');
                    await supabaseClient.from('articles').delete().eq('id', id);
                    if(document.getElementById('post-id').value === id) resetForm();
                    loadPosts();
                }
            });
        });
    }

    // Attach pagination listeners (only once)
    const prevBtn = document.getElementById('admin-prev-btn');
    const nextBtn = document.getElementById('admin-next-btn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (adminCurrentPage > 0) {
                adminCurrentPage--;
                loadPosts();
            }
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            adminCurrentPage++;
            loadPosts();
        });
    }

    // GENERATE SITEMAP
    const sitemapBtn = document.getElementById('generate-sitemap-btn');
    if (sitemapBtn) {
        sitemapBtn.addEventListener('click', async () => {
            sitemapBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Generating...';
            
            const { data: allPosts, error } = await supabaseClient.from('articles').select('id, created_at');
            if (error) {
                alert('Error fetching posts for sitemap: ' + error.message);
                sitemapBtn.innerHTML = '<i class="bi bi-diagram-3 me-1"></i>Generate Sitemap';
                return;
            }
            
            const baseUrl = 'https://ai-pulse-sepia-pi.vercel.app';
            let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
            
            xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
            xml += `  <url>\n    <loc>${baseUrl}/login.html</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;
            
            if (allPosts) {
                allPosts.forEach(p => {
                    xml += `  <url>\n    <loc>${baseUrl}/post.html?id=${p.id}</loc>\n    <lastmod>${p.created_at.split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
                });
            }
            
            const { data: allUsers } = await supabaseClient.from('user_profiles').select('id, created_at');
            if (allUsers) {
                allUsers.forEach(u => {
                    xml += `  <url>\n    <loc>${baseUrl}/profile.html?id=${u.id}</loc>\n    <lastmod>${u.created_at.split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
                });
            }
            
            xml += `</urlset>`;
            
            const blob = new Blob([xml], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sitemap.xml';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            sitemapBtn.innerHTML = '<i class="bi bi-diagram-3 me-1"></i>Generate Sitemap';
            alert('Sitemap downloaded successfully! Replace your local sitemap.xml with this new file and push to GitHub to index all your latest posts.');
        });
    }
    
    // LOAD & SAVE SETTINGS
    async function loadSettings() {
        const { data } = await supabaseClient.from('site_settings').select('*').eq('id', 1).single();
        if (data) {
            document.getElementById('setting-twitter').value = data.twitter || '';
            document.getElementById('setting-github').value = data.github || '';
            document.getElementById('setting-discord').value = data.discord || '';
        }
    }

    document.getElementById('settings-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const t = document.getElementById('setting-twitter').value;
        const g = document.getElementById('setting-github').value;
        const d = document.getElementById('setting-discord').value;
        const { error } = await supabaseClient.from('site_settings').update({ twitter: t, github: g, discord: d }).eq('id', 1);
        if(!error) {
            const setMsg = document.getElementById('settings-msg');
            setMsg.classList.remove('d-none');
            setTimeout(() => setMsg.classList.add('d-none'), 3000);
        } else {
            alert('Error saving settings: ' + error.message);
        }
    });

    // LOAD PASSWORD REQUESTS
    async function loadRequests() {
        const list = document.getElementById('admin-password-requests');
        const { data, error } = await supabaseClient.from('password_requests').select('*').order('created_at', { ascending: false });
        
        if (error) return;

        if (data && data.length > 0) {
            list.innerHTML = '';
            data.forEach(req => {
                list.innerHTML += `
                    <li class="list-group-item bg-transparent text-light px-0 d-flex justify-content-between align-items-center border-secondary py-3">
                        <div>
                            <div class="fw-medium">${req.email}</div>
                            <small class="text-muted">${new Date(req.created_at).toLocaleString()}</small>
                        </div>
                        <button class="btn btn-sm btn-outline-success resolve-req rounded-pill" data-id="${req.id}"><i class="bi bi-check2"></i> Resolve</button>
                    </li>
                `;
            });
            document.querySelectorAll('.resolve-req').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.currentTarget.getAttribute('data-id');
                    await supabaseClient.from('password_requests').delete().eq('id', id);
                    loadRequests();
                });
            });
        } else {
            list.innerHTML = '<li class="list-group-item bg-transparent text-muted px-0 border-0">No pending requests.</li>';
        }
    }

    // LOAD CATEGORIES
    async function loadCategories() {
        const catSelect = document.getElementById('post-category');
        const list = document.getElementById('admin-categories-list');
        
        const { data, error } = await supabaseClient.from('categories').select('*').order('name');
        
        if (error) {
            if (catSelect) catSelect.innerHTML = `<option value="">Error loading categories</option>`;
            if (list) list.innerHTML = `<li class="list-group-item bg-transparent text-danger px-0 border-0">${error.message}</li>`;
            return;
        }
        
        if (data && data.length > 0) {
            if (catSelect) {
                catSelect.innerHTML = '';
                data.forEach(c => {
                    catSelect.innerHTML += `<option value="${c.name}">${c.name}</option>`;
                });
            }
            if (list) {
                list.innerHTML = '';
                data.forEach(c => {
                    list.innerHTML += `
                        <li class="list-group-item bg-transparent text-light px-0 d-flex justify-content-between align-items-center border-secondary py-2">
                            <span>${c.name}</span>
                            <button class="btn btn-sm btn-outline-danger delete-cat rounded-pill" data-id="${c.id}"><i class="bi bi-trash"></i></button>
                        </li>
                    `;
                });
                
                document.querySelectorAll('.delete-cat').forEach(btn => {
                    btn.addEventListener('click', async (e) => {
                        if(confirm('Delete this category?')) {
                            const id = e.currentTarget.getAttribute('data-id');
                            await supabaseClient.from('categories').delete().eq('id', id);
                            loadCategories();
                        }
                    });
                });
            }
        } else {
            if (catSelect) catSelect.innerHTML = `<option value="">No categories found</option>`;
            if (list) list.innerHTML = `<li class="list-group-item bg-transparent text-muted px-0 border-0">No categories found. Run v2.0 schema script.</li>`;
        }
    }

    const addCatBtn = document.getElementById('add-category-btn');
    if (addCatBtn) {
        addCatBtn.addEventListener('click', async () => {
            const name = document.getElementById('new-category-name').value.trim();
            if(!name) return;
            const { error } = await supabaseClient.from('categories').insert([{name}]);
            if (error) alert('Error: ' + error.message);
            else {
                document.getElementById('new-category-name').value = '';
                loadCategories();
            }
        });
    }

    // LOAD USERS
    async function loadUsers() {
        const tbody = document.getElementById('admin-users-table');
        
        const { data: profiles, error: profError } = await supabaseClient.from('user_profiles').select('*');
        if (profError) {
            if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="text-danger">Run the v2.0 SQL Schema update to enable User Management.</td></tr>`;
            return;
        }
        
        const { data: roles } = await supabaseClient.from('user_roles').select('*');
        
        if (profiles && profiles.length > 0) {
            if (tbody) tbody.innerHTML = '';
            profiles.forEach(p => {
                const roleObj = (roles || []).find(r => r.user_id === p.id);
                const role = roleObj ? roleObj.role : 'user';
                const roleId = roleObj ? roleObj.id : null;
                const date = new Date(p.created_at).toLocaleDateString();
                
                const selectHtml = `
                    <select class="form-select form-select-sm bg-dark text-light border-secondary role-select d-inline-block w-auto" data-user="${p.id}" data-roleid="${roleId || ''}">
                        <option value="user" ${role === 'user' ? 'selected' : ''}>User</option>
                        <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
                    </select>
                `;
                
                if (tbody) {
                    tbody.innerHTML += `
                        <tr>
                            <td class="text-light">${p.email}</td>
                            <td class="text-muted small">${date}</td>
                            <td>${role === 'admin' ? '<span class="badge bg-danger">Admin</span>' : '<span class="badge bg-secondary">User</span>'}</td>
                            <td>
                                ${selectHtml}
                                <button class="btn btn-sm btn-outline-danger ms-2 delete-user rounded-pill" data-id="${p.id}" title="Eradicate Node"><i class="bi bi-trash"></i></button>
                            </td>
                        </tr>
                    `;
                }
            });
            
            document.querySelectorAll('.role-select').forEach(select => {
                select.addEventListener('change', async (e) => {
                    const newRole = e.target.value;
                    const userId = e.target.getAttribute('data-user');
                    const roleId = e.target.getAttribute('data-roleid');
                    
                    if (roleId) {
                        await supabaseClient.from('user_roles').update({ role: newRole }).eq('id', roleId);
                    } else {
                        await supabaseClient.from('user_roles').insert([{ user_id: userId, role: newRole }]);
                    }
                    loadUsers();
                });
            });
            
            document.querySelectorAll('.delete-user').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    if(confirm('WARNING: Are you sure you want to completely eradicate this user from the network? All their transmissions, comments, and profile data will be permanently destroyed.')) {
                        const userId = e.currentTarget.getAttribute('data-id');
                        const { error } = await supabaseClient.rpc('delete_user_by_admin', { target_user_id: userId });
                        if(error) {
                            alert('Error deleting node: ' + error.message);
                        } else {
                            loadUsers();
                        }
                    }
                });
            });
        } else {
            if (tbody) tbody.innerHTML = `<tr><td colspan="4" class="text-center text-muted py-4">No users found. Run v2.0 schema script.</td></tr>`;
        }
    }

    // Init Admin Logic
    loadPosts();
    loadSettings();
    loadRequests();
    loadCategories();
    loadUsers();
});
