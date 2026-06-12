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
    
    document.getElementById('post-title').textContent = post.title;
    document.getElementById('post-category').textContent = post.category || 'News';
    document.getElementById('post-date').innerHTML = `<i class="bi bi-calendar3 me-1"></i> ${new Date(post.created_at).toLocaleDateString()}`;
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
            
            comments.forEach(comment => {
                const date = new Date(comment.created_at).toLocaleString();
                list.innerHTML += `
                    <div class="card border border-secondary bg-dark p-3 rounded-4 shadow-sm widget-card">
                        <div class="d-flex align-items-center mb-3">
                            <i class="bi bi-person-circle fs-3 text-primary me-3"></i>
                            <div>
                                <h6 class="mb-0 text-light ai-font">Anonymous Node</h6>
                                <small class="text-muted" style="font-size: 0.75rem;">${date}</small>
                            </div>
                        </div>
                        <p class="mb-0 text-light" style="font-size: 0.95rem;">${comment.content}</p>
                    </div>
                `;
            });
        }
    }
    
    loadComments();

    // Submit Comment
    document.getElementById('comment-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('comment-input');
        
        const { error } = await supabaseClient.from('comments').insert([{
            article_id: postId,
            user_id: user.id,
            content: input.value
        }]);
        
        if (!error) {
            input.value = '';
            loadComments();
        } else {
            alert('Transmission failed: ' + error.message);
        }
    });
});
