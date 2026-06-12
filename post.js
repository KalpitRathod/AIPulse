document.addEventListener('DOMContentLoaded', async () => {
    if (!supabaseClient) {
        document.getElementById('post-loading').innerHTML = 'System offline. Supabase not initialized.';
        return;
    }

    const yearSpan = document.getElementById('current-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('id');
    
    if (!postId) {
        document.getElementById('post-loading').innerHTML = '<div class="alert alert-warning border-0 rounded-4">No article ID provided in transmission stream.</div>';
        return;
    }

    const user = await checkAuthAndUpdateUI();
    
    if (!user) {
        document.getElementById('comment-form').classList.add('d-none');
        document.getElementById('login-to-comment').classList.remove('d-none');
    }

    // Increment View Count immediately
    await supabaseClient.rpc('increment_view', { article_id_param: postId });

    // Load Post Data
    const { data: post, error } = await supabaseClient
        .from('articles')
        .select('*')
        .eq('id', postId)
        .single();
        
    if (error || !post) {
        document.getElementById('post-loading').innerHTML = '<div class="alert alert-danger border-0 rounded-4">Error accessing the requested transmission.</div>';
        return;
    }

    document.getElementById('post-loading').classList.add('d-none');
    document.getElementById('post-content-container').classList.remove('d-none');
    
    // Fetch Author
    const { data: authorProfile } = await supabaseClient.from('user_profiles').select('name').eq('id', post.author_id).single();
    const authorName = authorProfile?.name || 'Anonymous Node';
    document.getElementById('post-author').innerHTML = `<a href="profile.html?id=${post.author_id}" class="text-decoration-none text-info"><i class="bi bi-person me-1"></i>${authorName}</a>`;
    
    document.getElementById('post-title').textContent = post.title;
    document.getElementById('post-category').textContent = post.category || 'News';
    
    // Dynamic SEO Injection
    document.getElementById('meta-title').textContent = post.title + ' | AI Pulse';
    document.getElementById('meta-desc').setAttribute('content', post.excerpt);
    document.getElementById('og-title').setAttribute('content', post.title);
    document.getElementById('og-desc').setAttribute('content', post.excerpt);
    if(post.image_url) document.getElementById('og-image').setAttribute('content', post.image_url);
    document.getElementById('post-date').innerHTML = `<i class="bi bi-calendar3 me-1"></i> ${new Date(post.created_at).toLocaleDateString()}`;
    document.getElementById('post-views').textContent = (post.views || 0) + 1; // +1 to account for current view
    document.getElementById('post-image').src = post.image_url || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200';
    document.getElementById('post-body').innerHTML = post.content.replace(/\n/g, '<br>');

    // Load Likes
    async function loadLikes() {
        const { data, count, error } = await supabaseClient
            .from('likes')
            .select('*', { count: 'exact' })
            .eq('article_id', postId);
            
        if (error) return;

        document.getElementById('like-count').textContent = count;
        
        const likeBtn = document.getElementById('like-btn');
        const icon = likeBtn.querySelector('i');
        
        // Liked By Text
        const likedByContainer = document.getElementById('liked-by-users');
        if (data && data.length > 0) {
            const userIds = [...new Set(data.map(l => l.user_id))];
            const { data: profiles } = await supabaseClient.from('user_profiles').select('id, name').in('id', userIds);
            
            let names = data.map(l => {
                const p = profiles?.find(prof => prof.id === l.user_id);
                return (p && p.name) ? p.name.split(' ')[0] : 'Someone';
            });
            
            let text = `Liked by ${names[0]}`;
            if (count > 1) {
                text += ` and ${count - 1} other${count > 2 ? 's' : ''}`;
            }
            likedByContainer.textContent = text;
        } else {
            likedByContainer.textContent = 'Be the first to like this.';
        }

        if (user && data.some(like => like.user_id === user.id)) {
            icon.classList.replace('bi-heart', 'bi-heart-fill');
            likeBtn.classList.replace('btn-outline-danger', 'btn-danger');
            likeBtn.setAttribute('data-liked', 'true');
        } else {
            icon.classList.replace('bi-heart-fill', 'bi-heart');
            likeBtn.classList.replace('btn-danger', 'btn-outline-danger');
            likeBtn.setAttribute('data-liked', 'false');
        }
    }
    
    loadLikes();

    // Handle Like click
    document.getElementById('like-btn').addEventListener('click', async () => {
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        
        const isLiked = document.getElementById('like-btn').getAttribute('data-liked') === 'true';
        
        if (isLiked) {
            await supabaseClient.from('likes').delete().match({ article_id: postId, user_id: user.id });
        } else {
            await supabaseClient.from('likes').insert([{ article_id: postId, user_id: user.id }]);
        }
        
        loadLikes();
    });

    // Load Comments
    async function loadComments() {
        const { data: comments, error } = await supabaseClient
            .from('comments')
            .select('*')
            .eq('article_id', postId)
            .order('created_at', { ascending: false });
            
        const list = document.getElementById('comments-list');
        list.innerHTML = '';
        
        if (comments) {
            document.getElementById('comment-count').textContent = comments.length;
            
            if (comments.length === 0) {
                list.innerHTML = '<div class="text-muted text-center py-4 small border border-secondary rounded-4">No comments yet. Be the first to start the discussion.</div>';
            }
            
            const userIds = [...new Set(comments.map(c => c.user_id))];
            const { data: profiles } = await supabaseClient.from('user_profiles').select('id, name').in('id', userIds);
            
            const topLevel = comments.filter(c => !c.parent_id);
            const replies = comments.filter(c => c.parent_id);
            
            function renderComment(comment, depth = 0) {
                const date = new Date(comment.created_at).toLocaleString();
                const p = profiles?.find(prof => prof.id === comment.user_id);
                const authorName = (p && p.name) ? p.name : 'Anonymous Node';
                
                let deleteBtnHtml = '';
                if (user && user.id === comment.user_id) {
                    deleteBtnHtml = `<button class="btn btn-sm btn-outline-danger delete-comment-btn ms-auto" data-id="${comment.id}"><i class="bi bi-trash"></i></button>`;
                }
                
                let replyBtnHtml = '';
                if (user) {
                    replyBtnHtml = `<button class="btn btn-sm btn-link text-muted text-decoration-none p-0 reply-btn" data-id="${comment.id}" data-name="${authorName}"><i class="bi bi-reply-fill"></i> Reply</button>`;
                }

                const marginLeft = depth > 0 ? `margin-left: ${Math.min(depth * 2, 6)}rem;` : '';
                const borderClass = depth > 0 ? 'border-start border-primary border-4' : 'border-secondary';

                let html = `
                    <div class="card bg-dark p-3 rounded-4 shadow-sm widget-card mb-3 ${borderClass}" style="${marginLeft} border: 1px solid #3f3f46;">
                        <div class="d-flex align-items-center mb-2">
                            <div>
                                <h6 class="mb-0 ai-font">
                                    <a href="profile.html?id=${comment.user_id}" class="text-light text-decoration-none hover-primary">${authorName}</a>
                                </h6>
                                <small class="text-muted" style="font-size: 0.75rem;">${date}</small>
                            </div>
                            ${deleteBtnHtml}
                        </div>
                        <p class="mb-2 text-light" style="font-size: 0.95rem;">${comment.content}</p>
                        <div>${replyBtnHtml}</div>
                    </div>
                `;
                
                const children = replies.filter(c => c.parent_id === comment.id);
                children.forEach(child => {
                    html += renderComment(child, depth + 1);
                });
                
                return html;
            }

            let finalHtml = '';
            topLevel.forEach(comment => {
                finalHtml += renderComment(comment, 0);
            });
            list.innerHTML = finalHtml;
        }
    }
    
    loadComments();

    document.getElementById('comments-list').addEventListener('click', async (e) => {
        const delBtn = e.target.closest('.delete-comment-btn');
        if (delBtn) {
            if (confirm('Are you sure you want to delete this comment?')) {
                const commentId = delBtn.getAttribute('data-id');
                const { error } = await supabaseClient.from('comments').delete().eq('id', commentId);
                if (!error) loadComments();
                else alert('Error deleting: ' + error.message);
            }
            return;
        }
        
        const repBtn = e.target.closest('.reply-btn');
        if (repBtn) {
            const commentId = repBtn.getAttribute('data-id');
            const authorName = repBtn.getAttribute('data-name');
            document.getElementById('reply-parent-id').value = commentId;
            document.getElementById('replying-to-name').textContent = authorName;
            document.getElementById('replying-to-badge').classList.remove('d-none');
            document.getElementById('comment-input').focus();
        }
    });

    document.getElementById('cancel-reply-btn')?.addEventListener('click', () => {
        document.getElementById('reply-parent-id').value = '';
        document.getElementById('replying-to-badge').classList.add('d-none');
    });

    // Submit Comment
    document.getElementById('comment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('comment-input');
        const parentId = document.getElementById('reply-parent-id').value || null;
        
        const { error } = await supabaseClient.from('comments').insert([{
            article_id: postId,
            user_id: user.id,
            content: input.value,
            parent_id: parentId
        }]);
        
        if (!error) {
            input.value = '';
            document.getElementById('cancel-reply-btn')?.click();
            loadComments();
        } else {
            alert('Transmission failed: ' + error.message);
        }
    });

    // Social Sharing
    document.getElementById('share-twitter')?.addEventListener('click', () => {
        const shareUrl = encodeURIComponent(window.location.href);
        const shareTitle = encodeURIComponent(document.getElementById('post-title').textContent);
        window.open(`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareTitle}`, '_blank');
    });
    document.getElementById('share-linkedin')?.addEventListener('click', () => {
        const shareUrl = encodeURIComponent(window.location.href);
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`, '_blank');
    });
    document.getElementById('share-facebook')?.addEventListener('click', () => {
        const shareUrl = encodeURIComponent(window.location.href);
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`, '_blank');
    });
});
