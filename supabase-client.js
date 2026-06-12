// supabase-client.js
// Replace these with your actual Supabase URL and Anon Key from your Supabase Dashboard -> Project Settings -> API
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

let supabaseClient = null;

if (SUPABASE_URL !== 'YOUR_SUPABASE_PROJECT_URL' && typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Helper to check auth state and update UI globally
async function checkAuthAndUpdateUI() {
    if (!supabaseClient) return null;
    
    const { data: { session } } = await supabaseClient.auth.getSession();
    const user = session?.user;
    
    const authLinkContainer = document.getElementById('auth-link-container');
    if (authLinkContainer) {
        if (user) {
            authLinkContainer.innerHTML = `
                <a href="admin.html" class="btn btn-outline-light rounded-pill px-3 me-2 shadow-sm border-secondary text-decoration-none">Dashboard</a>
                <button id="logout-btn" class="btn btn-primary rounded-pill px-4 shadow-sm">Logout</button>
            `;
            document.getElementById('logout-btn').addEventListener('click', async () => {
                await supabaseClient.auth.signOut();
                window.location.reload();
            });
        } else {
            authLinkContainer.innerHTML = `
                <a href="login.html" class="btn btn-primary rounded-pill px-4 shadow-sm text-decoration-none">Login / Sign Up</a>
            `;
        }
    }
    return user;
}
