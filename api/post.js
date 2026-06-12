const fs = require('fs');
const path = require('path');

export default async function handler(req, res) {
    const { id } = req.query;

    // Read the static post.html file
    const filePath = path.join(process.cwd(), 'post.html');
    let html = '';
    try {
        html = fs.readFileSync(filePath, 'utf8');
    } catch (e) {
        return res.status(500).send("Error reading HTML file");
    }

    if (!id) {
        res.setHeader('Content-Type', 'text/html');
        return res.status(200).send(html);
    }

    const SUPABASE_URL = 'https://rccdckmudvvhluhcnvni.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJjY2Rja211ZHZ2aGx1aGNudm5pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyNjA5MTcsImV4cCI6MjA5NjgzNjkxN30.hBcyzIj8gA1RiLg5aTnFyQaO2MxmK8YRvGk2F9ZPKbI';

    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/articles?id=eq.${id}&select=*`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
            }
        });
        
        const data = await response.json();
        
        if (data && data.length > 0) {
            const post = data[0];
            const title = post.title.replace(/"/g, '&quot;');
            const excerpt = (post.excerpt || '').replace(/"/g, '&quot;');
            const image = post.image_url || 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=1200';
            
            // Inject dynamic Open Graph meta tags into the HTML string
            html = html.replace(/<title id="meta-title">.*?<\/title>/g, `<title id="meta-title">${title} | AI Pulse</title>`);
            html = html.replace(/<meta name="description" id="meta-desc" content=".*?">/g, `<meta name="description" id="meta-desc" content="${excerpt}">`);
            html = html.replace(/<meta property="og:title" id="og-title" content=".*?">/g, `<meta property="og:title" id="og-title" content="${title} | AI Pulse">`);
            html = html.replace(/<meta property="og:description" id="og-desc" content=".*?">/g, `<meta property="og:description" id="og-desc" content="${excerpt}">`);
            html = html.replace(/<meta property="og:image" id="og-image" content=".*?">/g, `<meta property="og:image" id="og-image" content="${image}">`);
            html = html.replace(/<meta name="twitter:card" content=".*?">/g, `<meta name="twitter:card" content="summary_large_image">`);
        }
    } catch (e) {
        console.error("Fetch error during SSR:", e);
    }

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate'); // Edge caching for performance
    res.status(200).send(html);
}
