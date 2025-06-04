import { google } from 'googleapis'
import { getSession } from 'next-auth/react'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const session = await getSession({ req })

    if (!session || !session.accessToken) {
        return res.status(401).json({ error: 'Unauthorized' })
    }

    const auth = new google.auth.OAuth2()

    auth.setCredentials({
        access_token: session.accessToken
    })

    const calendar = google.calendar({ version: 'v3', auth })

    const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        showDeleted: false,
        maxResults: 37,
        singleEvents: true,
        orderBy: 'startTime'
    })

    console.log("Calendar fetch response", response)

    res.status(200).json(response.data)
}