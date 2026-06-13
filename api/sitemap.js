export default async function handler(req, res) {
    const SUPABASE_URL = 'https://rccdckmudvvhluhcnvni.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjY2Rja211ZHZ2aGx1aGNudm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjA5MTcsImV4cCI6MjA5NjgzNjkxN30.hBcyzIj8gA1RiLg5aTnFyQaO2MxmK8YRvGk2F9ZPKbI';

    const baseUrl = 'https://ai-pulse-sepia-pi.vercel.app';
    let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

    xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;
    xml += `  <url>\n    <loc>${baseUrl}/login.html</loc>\n    <changefreq>monthly</changefreq>\n    <priority>0.5</priority>\n  </url>\n`;

    try {
        const postRes = await fetch(`${SUPABASE_URL}/rest/v1/articles?select=id,slug,created_at`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const allPosts = await postRes.json();
        
        if (allPosts && Array.isArray(allPosts)) {
            allPosts.forEach(p => {
                xml += `  <url>\n    <loc>${baseUrl}/post/${p.slug || p.id}</loc>\n    <lastmod>${p.created_at.split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
            });
        }

        const userRes = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?select=id,created_at`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        const allUsers = await userRes.json();
        
        if (allUsers && Array.isArray(allUsers)) {
            allUsers.forEach(u => {
                xml += `  <url>\n    <loc>${baseUrl}/profile.html?id=${u.id}</loc>\n    <lastmod>${u.created_at.split('T')[0]}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>\n`;
            });
        }
    } catch (e) {
        console.error("Sitemap generation error:", e);
    }

    xml += `</urlset>`;

    res.setHeader('Content-Type', 'text/xml');
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate'); // Cache for 1 day
    res.status(200).send(xml);
}
