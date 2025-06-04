import type { NextApiRequest, NextApiResponse } from 'next';

export async function handleGoogleAuth(req: NextApiRequest, res: NextApiResponse) {
    const code = req.query.code as string;

    if (!code) {
        return res.status(400).json({ error: 'Missing code' });
    }

    const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            redirect_uri: process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URI!,
            grant_type: 'authorization_code'
        })
    });

    const data = await response.json();

    // Store tokens in session, DB, or cookies (demo only)
    console.log('Tokens:', data);

    // Redirect or respond
    res.redirect(`/session?token=${data.access_token}`);
}

export async function fetchEvents(req: NextApiRequest, res: NextApiResponse) {
    const accessToken = req.headers.authorization?.split('Bearer ')[1];
    if (!accessToken) return res.status(401).json({ error: 'Missing token' });

    const calendarRes = await fetch(
        'https://www.googleapis.com/calendar/v3/calendars/primary/events',
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        }
    );

    const events = await calendarRes.json();
    res.status(200).json(events);
}