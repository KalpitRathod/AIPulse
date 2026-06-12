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
    
    // Global variable to store current posts for easy editing
    let currentPosts = [];

    function resetForm() {
        form.reset();
        document.getElementById('post-id').value = '';
        formTitle.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Create Transmission';
        submitBtn.textContent = 'Publish to Network';
        cancelEditBtn.classList.add('d-none');
    }

    if(cancelEditBtn) cancelEditBtn.addEventListener('click', resetForm);
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        msg.classList.add('d-none');
        
        const postId = document.getElementById('post-id').value;
        const postData = {
            title: document.getElementById('post-title').value,
            category: document.getElementById('post-category').value,
            image_url: document.getElementById('post-image').value,
            excerpt: document.getElementById('post-excerpt').value,
            content: document.getElementById('post-content').value,
            is_featured: document.getElementById('post-featured').checked,
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

    // LOAD POSTS
    async function loadPosts() {
        const tbody = document.getElementById('admin-posts-table');
        
        const { data, error } = await supabaseClient
            .from('articles')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-danger">Error: ${error.message}</td></tr>`;
            return;
        }
        
        currentPosts = data || [];
        
        if (currentPosts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted py-4">No transmissions found in the database.</td></tr>`;
            return;
        }
        
        tbody.innerHTML = '';
        currentPosts.forEach(post => {
            const date = new Date(post.created_at).toLocaleDateString();
            const starIcon = post.is_featured ? '<i class="bi bi-star-fill text-warning"></i>' : '<i class="bi bi-star text-muted"></i>';
            tbody.innerHTML += `
                <tr>
                    <td class="text-light fw-medium"><a href="post.html?id=${post.id}" class="text-light text-decoration-none">${post.title}</a></td>
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
                    document.getElementById('post-content').value = post.content;
                    document.getElementById('post-featured').checked = post.is_featured;
                    
                    formTitle.innerHTML = '<i class="bi bi-pencil-square me-2"></i>Update Transmission';
                    submitBtn.textContent = 'Save Changes';
                    cancelEditBtn.classList.remove('d-none');
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

    // Init Admin Logic
    loadPosts();
    loadSettings();
    loadRequests();
});
