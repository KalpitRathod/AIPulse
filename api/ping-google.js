const { google } = require('googleapis');

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
        const privateKey = process.env.GOOGLE_PRIVATE_KEY;

        if (!clientEmail || !privateKey) {
            return res.status(500).json({ error: 'Google Credentials missing from environment variables' });
        }

        // Replace literal escaped newlines with actual newlines to fix env var formatting
        const formattedKey = privateKey.replace(/\\n/g, '\n');

        const auth = new google.auth.GoogleAuth({
            credentials: {
                client_email: clientEmail,
                private_key: formattedKey
            },
            scopes: ['https://www.googleapis.com/auth/webmasters'],
        });

        const searchconsole = google.searchconsole({ version: 'v1', auth });

        // URL-encode the site URL and sitemap feedpath as required by Google Search Console API
        const siteUrl = 'https://ai-pulse-sepia-pi.vercel.app/'; 
        const feedpath = 'https://ai-pulse-sepia-pi.vercel.app/sitemap.xml';

        const response = await searchconsole.sitemaps.submit({
            siteUrl: encodeURIComponent(siteUrl),
            feedpath: encodeURIComponent(feedpath)
        });

        return res.status(200).json({ success: true, message: 'Successfully submitted sitemap to Google Search Console', data: response.data });
    } catch (error) {
        console.error('Google Ping Error:', error);
        return res.status(500).json({ error: 'Failed to ping Google', details: error.message });
    }
}
