document.addEventListener('DOMContentLoaded', async () => {
    // Utilities
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    // Theme Toggle Logic
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    const themeIcon = themeToggleBtn.querySelector('i');

    let savedTheme = localStorage.getItem('theme');
    if (!savedTheme) {
        savedTheme = 'dark';
        localStorage.setItem('theme', 'dark');
    }
    
    htmlElement.setAttribute('data-bs-theme', savedTheme);
    updateIcon(savedTheme);

    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-bs-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        htmlElement.setAttribute('data-bs-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateIcon(newTheme);
    });

    function updateIcon(theme) {
        if (theme === 'dark') {
            themeIcon.classList.remove('bi-moon-stars');
            themeIcon.classList.add('bi-sun');
            themeToggleBtn.classList.remove('btn-outline-dark');
            themeToggleBtn.classList.add('btn-outline-light');
        } else {
            themeIcon.classList.remove('bi-sun');
            themeIcon.classList.add('bi-moon-stars');
            themeToggleBtn.classList.remove('btn-outline-light');
            themeToggleBtn.classList.add('btn-outline-dark');
        }
    }

    // Check Auth and update Navbar
    await checkAuthAndUpdateUI();

    // Setup DOM Elements
    const dbStatusBadge = document.getElementById('db-status');
    const container = document.getElementById('dynamic-posts-container');
    const heroContainer = document.getElementById('hero-container');
    const spinner = document.getElementById('loading-spinner');
    const loadMoreBtnContainer = document.getElementById('load-more-container');
    const loadMoreBtn = document.getElementById('load-more-btn');

    let currentPage = 0;
    const postsPerPage = 4; // Fetch 4 posts at a time for pagination
    let loadedFeaturedId = null;

    if (supabaseClient) {
        try {
            if(dbStatusBadge) {
                dbStatusBadge.innerHTML = '<i class="bi bi-database-check me-1"></i> Database Online';
                dbStatusBadge.classList.replace('bg-secondary', 'bg-success');
            }
            
            // 1. Fetch Featured Post (Hero) Only on First Load
            if (heroContainer) {
                const { data: featuredPosts, error: featError } = await supabaseClient
                    .from('articles')
                    .select('*')
                    .eq('is_featured', true)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (featuredPosts && featuredPosts.length > 0) {
                    const fPost = featuredPosts[0];
                    loadedFeaturedId = fPost.id;
                    heroContainer.innerHTML = `
                    <header class="hero-section py-5 mb-5 rounded-bottom-4 shadow-sm" style="background: linear-gradient(180deg, #18181b 0%, #09090b 100%); border-bottom: 1px solid #27272a;">
                        <div class="container px-4 px-lg-5 my-5">
                            <div class="row align-items-center">
                                <div class="col-lg-6">
                                    <span class="badge bg-primary rounded-pill px-3 py-2 mb-3 text-uppercase tracking-wide"><i class="bi bi-star-fill me-1"></i> Featured Transmission</span>
                                    <h1 class="display-4 fw-bolder mb-4 ai-font text-light" style="word-wrap: break-word;">${fPost.title}</h1>
                                    <p class="lead fw-normal text-muted mb-4" style="word-wrap: break-word;">${fPost.excerpt}</p>
                                    <a href="post.html?id=${fPost.id}" class="btn btn-primary btn-lg rounded-pill px-5 py-3 shadow-sm">Read Analysis</a>
                                </div>
                                <div class="col-lg-6 mt-5 mt-lg-0 text-center">
                                    <img class="img-fluid rounded-4 shadow-lg border border-secondary" style="max-height: 400px; object-fit: cover; filter: drop-shadow(0 0 20px rgba(168, 85, 247, 0.2));" src="${fPost.image_url || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200'}" alt="Featured Image">
                                </div>
                            </div>
                        </div>
                    </header>`;
                } else {
                    heroContainer.innerHTML = `
                    <header class="hero-section py-5 mb-5 rounded-bottom-4 shadow-sm" style="background: linear-gradient(180deg, #18181b 0%, #09090b 100%);">
                        <div class="container px-4 px-lg-5 my-5 text-center">
                            <h1 class="display-4 fw-bolder mb-4 ai-font text-light">The Frontier of AI</h1>
                            <p class="lead fw-normal text-muted mb-4">No featured transmissions currently online. Access archive below.</p>
                        </div>
                    </header>`;
                }
            }

            // 2. Fetch Regular Posts with Pagination
            async function fetchPostsGrid() {
                if (!container) return;
                
                if (currentPage === 0) container.innerHTML = '';
                if(spinner) spinner.classList.remove('d-none');
                
                const from = currentPage * postsPerPage;
                const to = from + postsPerPage - 1;

                const { data: articles, error } = await supabaseClient
                    .from('articles')
                    .select('*')
                    .order('created_at', { ascending: false })
                    .range(from, to);

                if (error) {
                    container.innerHTML += `<div class="alert alert-danger">Error: ${error.message}</div>`;
                    return;
                }

                if (articles && articles.length > 0) {
                    articles.forEach(article => {
                        // Skip rendering the featured post in the grid if it's already shown
                        if (loadedFeaturedId === article.id) return;

                        const date = new Date(article.created_at).toLocaleDateString();
                        const html = `
                        <div class="card mb-4 border-0 shadow-sm rounded-4 overflow-hidden blog-card widget-card">
                            <a href="post.html?id=${article.id}"><img class="card-img-top border-bottom border-secondary" style="height: 250px; object-fit: cover;" src="${article.image_url || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800'}" alt="Article" /></a>
                            <div class="card-body p-4">
                                <div class="small text-muted mb-2">
                                    <span class="badge bg-primary me-2 px-2 py-1">${article.category || 'AI News'}</span> 
                                    <i class="bi bi-calendar3 me-1"></i> ${date}
                                </div>
                                <h2 class="card-title h4 fw-bold ai-font mt-3" style="word-wrap: break-word;"><a href="post.html?id=${article.id}" class="text-decoration-none text-light">${article.title}</a></h2>
                                <p class="card-text text-muted mb-4" style="word-wrap: break-word;">${article.excerpt}</p>
                                <a class="btn btn-sm btn-outline-primary rounded-pill px-4 fw-medium" href="post.html?id=${article.id}">Read Analysis →</a>
                            </div>
                        </div>
                        `;
                        container.innerHTML += html;
                    });
                    
                    // Show or hide load more button
                    if (articles.length === postsPerPage && loadMoreBtnContainer) {
                        loadMoreBtnContainer.classList.remove('d-none');
                    } else if (loadMoreBtnContainer) {
                        loadMoreBtnContainer.classList.add('d-none');
                    }
                    
                } else if (currentPage === 0) {
                    container.innerHTML = `<div class="alert bg-dark border border-secondary text-center text-muted rounded-4 py-4 w-100">Database is empty.</div>`;
                    if (loadMoreBtnContainer) loadMoreBtnContainer.classList.add('d-none');
                } else {
                    // No more posts
                    if (loadMoreBtnContainer) loadMoreBtnContainer.classList.add('d-none');
                }
                
                if(spinner) spinner.classList.add('d-none');
            }

            // Initial fetch
            await fetchPostsGrid();

            // Load More Click Event
            if (loadMoreBtn) {
                loadMoreBtn.addEventListener('click', async () => {
                    currentPage++;
                    loadMoreBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Fetching...';
                    await fetchPostsGrid();
                    loadMoreBtn.innerHTML = 'Fetch More Transmissions';
                });
            }

            // 3. Fetch Dynamic Footer Links
            const { data: settings } = await supabaseClient.from('site_settings').select('*').eq('id', 1).single();
            if (settings) {
                const tw = document.getElementById('footer-link-twitter');
                const gh = document.getElementById('footer-link-github');
                const dc = document.getElementById('footer-link-discord');
                if(tw && settings.twitter) tw.href = settings.twitter;
                if(gh && settings.github) gh.href = settings.github;
                if(dc && settings.discord) dc.href = settings.discord;
            }

        } catch (error) {
            console.error('Error:', error);
            if(dbStatusBadge) {
                dbStatusBadge.innerHTML = '<i class="bi bi-database-exclamation me-1"></i> Connection Error';
                dbStatusBadge.classList.replace('bg-success', 'bg-danger');
            }
        }
    }
});
