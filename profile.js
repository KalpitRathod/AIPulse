document.addEventListener('DOMContentLoaded', async () => {
    if (!supabaseClient) return;

    const urlParams = new URLSearchParams(window.location.search);
    const profileId = urlParams.get('id');

    if (!profileId) {
        document.getElementById('profile-loading').innerHTML = '<div class="alert alert-warning border-0 rounded-4">No user ID provided.</div>';
        return;
    }

    const currentUser = await checkAuthAndUpdateUI();

    // Fetch Profile
    const { data: profile, error } = await supabaseClient.from('user_profiles').select('*').eq('id', profileId).single();
    
    if (error || !profile) {
        document.getElementById('profile-loading').innerHTML = '<div class="alert alert-danger border-0 rounded-4">Profile not found.</div>';
        return;
    }

    // Fetch Role
    const { data: roleData } = await supabaseClient.from('user_roles').select('role').eq('user_id', profileId).single();
    const role = roleData ? roleData.role : 'user';

    document.getElementById('profile-loading').classList.add('d-none');
    document.getElementById('profile-content').classList.remove('d-none');

    // Populate UI
    document.getElementById('profile-name').textContent = profile.name || 'Anonymous Node';
    document.getElementById('profile-role').innerHTML = role === 'admin' ? '<span class="badge bg-danger">Network Admin</span>' : '<span class="badge bg-secondary">Standard Node</span>';
    document.getElementById('profile-about').textContent = profile.about || 'No bio provided.';

    let socialsHtml = '';
    if (profile.twitter) socialsHtml += `<a href="${profile.twitter}" target="_blank" class="btn btn-outline-light rounded-circle icon-btn"><i class="bi bi-twitter-x"></i></a>`;
    if (profile.github) socialsHtml += `<a href="${profile.github}" target="_blank" class="btn btn-outline-light rounded-circle icon-btn"><i class="bi bi-github"></i></a>`;
    if (profile.linkedin) socialsHtml += `<a href="${profile.linkedin}" target="_blank" class="btn btn-outline-light rounded-circle icon-btn"><i class="bi bi-linkedin"></i></a>`;
    document.getElementById('profile-socials').innerHTML = socialsHtml;

    // Show Edit Button if owner
    if (currentUser && currentUser.id === profileId) {
        document.getElementById('edit-profile-btn-container').classList.remove('d-none');
        document.getElementById('edit-name').value = profile.name || '';
        document.getElementById('edit-about').value = profile.about || '';
        document.getElementById('edit-twitter').value = profile.twitter || '';
        document.getElementById('edit-github').value = profile.github || '';
        document.getElementById('edit-linkedin').value = profile.linkedin || '';
    }

    // Fetch Comments
    const { data: comments } = await supabaseClient.from('comments').select('*, articles(title, id)').eq('user_id', profileId).order('created_at', { ascending: false });
    const list = document.getElementById('user-comments-list');
    
    if (comments && comments.length > 0) {
        list.innerHTML = '';
        comments.forEach(c => {
            const date = new Date(c.created_at).toLocaleString();
            list.innerHTML += `
                <div class="card border border-secondary bg-dark p-3 rounded-4 shadow-sm widget-card">
                    <div class="mb-2">
                        <small class="text-primary fw-bold">Commented on: <a href="post.html?id=${c.article_id}" class="text-decoration-none text-info">${c.articles.title}</a></small>
                        <br><small class="text-muted" style="font-size: 0.75rem;">${date}</small>
                    </div>
                    <p class="mb-0 text-light" style="font-size: 0.95rem;">${c.content}</p>
                </div>
            `;
        });
    } else {
        list.innerHTML = '<div class="text-muted border border-secondary rounded-4 p-4 text-center">No transmissions logged by this node.</div>';
    }

    // Form Submits
    document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const updates = {
            name: document.getElementById('edit-name').value,
            about: document.getElementById('edit-about').value,
            twitter: document.getElementById('edit-twitter').value,
            github: document.getElementById('edit-github').value,
            linkedin: document.getElementById('edit-linkedin').value
        };
        const { error } = await supabaseClient.from('user_profiles').update(updates).eq('id', profileId);
        if (error) alert(error.message);
        else window.location.reload();
    });

    document.getElementById('update-password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const newPassword = document.getElementById('new-password').value;
        const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
        if (error) alert(error.message);
        else {
            alert('Password updated successfully!');
            document.getElementById('new-password').value = '';
        }
    });
});
