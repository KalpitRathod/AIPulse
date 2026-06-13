document.addEventListener('DOMContentLoaded', async () => {
    if (!supabaseClient) return;

    // Check auth
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'login.html';
        return;
    }

    const form = document.getElementById('create-post-form');
    const msg = document.getElementById('post-msg');
    const submitBtn = document.getElementById('submit-post-btn');
    
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

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Transmitting...';
        
        const titleVal = document.getElementById('post-title').value;
        const slugStr = titleVal.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Math.random().toString(36).substr(2, 5);
        
        const postData = {
            title: titleVal,
            slug: slugStr,
            category: document.getElementById('post-category').value,
            image_url: document.getElementById('post-image').value,
            excerpt: document.getElementById('post-excerpt').value,
            content: quill.root.innerHTML,
            is_featured: false,
            status: 'published',
            type: 'community',
            author_id: session.user.id
        };
        
        const { error } = await supabaseClient.from('articles').insert([postData]);
        
        if (error) {
            alert('Error saving transmission: ' + error.message);
        } else {
            msg.classList.remove('d-none');
            form.reset();
            quill.root.innerHTML = '';
            
            // Ping Google Search Console to crawl the new Sitemap
            try { fetch('/api/ping-google', { method: 'POST' }); } catch(e) {}
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
        
        submitBtn.disabled = false;
        submitBtn.textContent = 'Broadcast to Community';
    });
});
