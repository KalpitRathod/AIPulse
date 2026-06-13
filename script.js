document.addEventListener('DOMContentLoaded', async () => {
    // Utilities
    const yearSpan = document.getElementById('current-year');
    if (yearSpan) yearSpan.textContent = new Date().getFullYear();

    // Light mode removed - purely dark mode now

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
                    .eq('status', 'published')
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (featuredPosts && featuredPosts.length > 0) {
                    const fPost = featuredPosts[0];
                    loadedFeaturedId = fPost.id;
                    const { data: fProfile } = await supabaseClient.from('user_profiles').select('name').eq('id', fPost.author_id).single();
                    const fAuthorName = fProfile?.name || 'Anonymous Node';
                    
                    heroContainer.innerHTML = `
                    <header class="hero-section py-5 mb-5 rounded-bottom-4 shadow-sm" style="background: linear-gradient(180deg, #18181b 0%, #09090b 100%); border-bottom: 1px solid #27272a;">
                        <div class="container px-4 px-lg-5 my-5">
                            <div class="row align-items-center">
                                <div class="col-lg-6">
                                    <span class="badge bg-primary rounded-pill px-3 py-2 mb-3 text-uppercase tracking-wide"><i class="bi bi-star-fill me-1"></i> Featured Transmission</span>
                                    <div class="mb-3 d-flex align-items-center">
                                        <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center fw-bold me-2 shadow-sm" style="width: 32px; height: 32px; font-size: 0.85rem;">
                                            ${fAuthorName.charAt(0).toUpperCase()}
                                        </div>
                                        <a href="profile.html?id=${fPost.author_id}" class="text-decoration-none text-light fw-medium">${fAuthorName}</a>
                                    </div>
                                    <h1 class="display-4 fw-bolder mb-4 ai-font text-light" style="word-wrap: break-word;">${fPost.title}</h1>
                                    <p class="lead fw-normal text-muted mb-4" style="word-wrap: break-word;">${fPost.excerpt}</p>
                                    <a href="/post/${fPost.slug || fPost.id}" class="btn btn-primary btn-lg rounded-pill px-5 py-3 shadow-sm">Read Analysis</a>
                                </div>
                                <div class="col-lg-6 mt-5 mt-lg-0 text-center">
                                    <img class="img-fluid rounded-4 shadow-lg border border-secondary" width="100%" height="400" style="max-height: 400px; object-fit: cover; filter: drop-shadow(0 0 20px rgba(168, 85, 247, 0.2));" src="${fPost.image_url ? fPost.image_url.replace('/upload/', '/upload/w_800,c_scale/') : 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200'}" alt="${fPost.title}">
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

            // State for query and categories
            let currentSearchQuery = null;
            let currentCategory = null;
            let currentFeed = 'official';

            // 2. Fetch Regular Posts with Pagination & Filters
            async function fetchPostsGrid(reset = false) {
                if (!container) return;
                
                if (reset) {
                    currentPage = 0;
                    container.innerHTML = '';
                    if (heroContainer) heroContainer.classList.add('d-none'); // Hide hero on search/filter
                }
                
                if(spinner) spinner.classList.remove('d-none');
                
                const from = currentPage * postsPerPage;
                const to = from + postsPerPage - 1;

                let query = supabaseClient
                    .from('articles')
                    .select('*')
                    .eq('status', 'published')
                    .order('created_at', { ascending: false })
                    .range(from, to);
                    
                if (currentFeed === 'official') {
                    query = query.eq('type', 'official');
                } else if (currentFeed === 'community') {
                    query = query.eq('type', 'community');
                } else if (currentFeed === 'following') {
                    const { data: sessionData } = await supabaseClient.auth.getSession();
                    const user = sessionData?.session?.user;
                    if (!user) {
                        container.innerHTML = `<div class="alert bg-dark border border-secondary text-center text-muted rounded-4 py-4 w-100">Authenticate to view your following feed.</div>`;
                        if (spinner) spinner.classList.add('d-none');
                        if (loadMoreBtnContainer) loadMoreBtnContainer.classList.add('d-none');
                        return;
                    }
                    const { data: follows } = await supabaseClient.from('follows').select('following_id').eq('follower_id', user.id);
                    if (follows && follows.length > 0) {
                        const followingIds = follows.map(f => f.following_id);
                        query = query.in('author_id', followingIds);
                    } else {
                        container.innerHTML = `<div class="alert bg-dark border border-secondary text-center text-muted rounded-4 py-4 w-100">You are not following any active nodes yet.</div>`;
                        if (spinner) spinner.classList.add('d-none');
                        if (loadMoreBtnContainer) loadMoreBtnContainer.classList.add('d-none');
                        return;
                    }
                }

                if (currentSearchQuery) {
                    query = query.or(`title.ilike.%${currentSearchQuery}%,excerpt.ilike.%${currentSearchQuery}%,content.ilike.%${currentSearchQuery}%`);
                }
                
                if (currentCategory) {
                    query = query.eq('category', currentCategory);
                }

                const { data: articles, error } = await query;

                if (error) {
                    container.innerHTML += `<div class="alert alert-danger">Error: ${error.message}</div>`;
                    if(spinner) spinner.classList.add('d-none');
                    return;
                }

                if (articles && articles.length > 0) {
                    const authorIds = [...new Set(articles.map(a => a.author_id))];
                    const { data: profiles } = await supabaseClient.from('user_profiles').select('id, name').in('id', authorIds);
                    
                    articles.forEach(article => {
                        const author = profiles?.find(p => p.id === article.author_id);
                        const authorName = author?.name || 'Anonymous Node';
                        // Skip rendering the featured post ONLY IF we are not searching/filtering
                        if (!currentSearchQuery && !currentCategory && loadedFeaturedId === article.id) return;

                        const date = new Date(article.created_at).toLocaleDateString();
                        const html = `
                        <div class="card mb-4 border-0 shadow-sm rounded-4 overflow-hidden blog-card widget-card d-flex flex-column h-100">
                            <a href="/post/${article.slug || article.id}" tabindex="-1" aria-hidden="true"><img class="card-img-top border-bottom border-secondary" width="100%" height="250" style="height: 250px; object-fit: cover;" src="${article.image_url ? article.image_url.replace('/upload/', '/upload/w_400,c_scale/') : 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800'}" alt="${article.title}" /></a>
                            <div class="card-body p-4 d-flex flex-column">
                                <div class="small text-muted mb-2">
                                    <span class="badge bg-primary me-2 px-2 py-1">${article.category || 'AI News'}</span> 
                                    <i class="bi bi-calendar3 me-1"></i> ${date}
                                </div>
                                <h2 class="card-title h4 fw-bold ai-font mt-2" style="word-wrap: break-word;"><a href="/post/${article.slug || article.id}" class="text-decoration-none text-light">${article.title}</a></h2>
                                <p class="card-text text-muted mb-4 flex-grow-1" style="word-wrap: break-word;">${article.excerpt}</p>
                                
                                <div class="d-flex align-items-center justify-content-between mt-auto pt-3 border-top border-secondary">
                                    <div class="d-flex align-items-center">
                                        <div class="bg-secondary bg-opacity-25 text-light rounded-circle d-flex align-items-center justify-content-center fw-bold me-2" style="width: 28px; height: 28px; font-size: 0.75rem;">
                                            ${authorName.charAt(0).toUpperCase()}
                                        </div>
                                        <a href="profile.html?id=${article.author_id}" class="text-decoration-none text-light small fw-medium">${authorName}</a>
                                    </div>
                                    <a class="btn btn-sm btn-outline-primary rounded-pill px-3 fw-medium" tabindex="-1" aria-hidden="true" href="/post/${article.slug || article.id}">Read →</a>
                                </div>
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
                    container.innerHTML = `<div class="alert bg-dark border border-secondary text-center text-muted rounded-4 py-4 w-100">No transmissions found matching your criteria.</div>`;
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

            // --- WIDGET EVENT LISTENERS ---
            
            // Main Nav Tabs
            const mainNavTabs = document.querySelectorAll('.nav-tab-link');
            mainNavTabs.forEach(tab => {
                tab.addEventListener('click', async (e) => {
                    e.preventDefault();
                    currentFeed = e.currentTarget.getAttribute('data-feed');
                    
                    mainNavTabs.forEach(t => t.classList.remove('active', 'text-primary'));
                    e.currentTarget.classList.add('active', 'text-primary');
                    
                    // Reset filters
                    if (searchInput) searchInput.value = '';
                    currentSearchQuery = null;
                    currentCategory = null;
                    document.querySelectorAll('.category-filter').forEach(el => el.classList.remove('fw-bold', 'text-light'));
                    
                    await fetchPostsGrid(true);
                });
            });
            
            // Search Input Logic
            const searchInput = document.getElementById('search-input');
            const searchBtn = document.getElementById('button-search');
            
            if (searchBtn && searchInput) {
                const performSearch = async () => {
                    currentSearchQuery = searchInput.value.trim() || null;
                    currentCategory = null; // Reset category when searching
                    
                    // Reset styling on categories
                    document.querySelectorAll('.category-filter').forEach(el => el.classList.remove('fw-bold', 'text-light'));
                    
                    await fetchPostsGrid(true);
                };
                
                searchBtn.addEventListener('click', performSearch);
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') performSearch();
                });
            }

            // Category Filter Logic
            const catFilters = document.querySelectorAll('.category-filter');
            catFilters.forEach(filter => {
                filter.addEventListener('click', async (e) => {
                    e.preventDefault();
                    
                    // Reset search
                    if (searchInput) searchInput.value = '';
                    currentSearchQuery = null;
                    
                    const selectedCat = e.currentTarget.getAttribute('data-category');
                    
                    // Toggle Logic
                    if (currentCategory === selectedCat) {
                        // Un-select
                        currentCategory = null;
                        e.currentTarget.classList.remove('fw-bold', 'text-light');
                        if (heroContainer) heroContainer.classList.remove('d-none'); // Show hero again
                    } else {
                        // Select
                        currentCategory = selectedCat;
                        catFilters.forEach(el => el.classList.remove('fw-bold', 'text-light'));
                        e.currentTarget.classList.add('fw-bold', 'text-light');
                    }
                    
                    await fetchPostsGrid(true);
                });
            });

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
