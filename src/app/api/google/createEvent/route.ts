import { NextResponse } from 'next/server'
import { getAuthSession } from '@/auth'
import { google } from 'googleapis'

export async function POST(request: Request) {
    console.log("Reached create event handler")
    const session = await getAuthSession()

    if (!session || !session.accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const auth = new google.auth.OAuth2()

    auth.setCredentials({
        access_token: session.accessToken
    })

    const body = await request.json()

    const event = {
        'summary': body.title,
        'start': {
            'dateTime': body.start,
            'timeZone': body.timezone
        },
        'end': {
            'dateTime': body.end,
            'timeZone': body.timezone
        }
    }

    console.log("Event to be created", event)

    const calendar = google.calendar({ version: 'v3', auth })

    try {
        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event,
        }, undefined)

        console.log("Calendar event insertion response", response)
        return NextResponse.json(response.data)
    } catch (error) {
        console.error("Error creating calendar event:", error)
        return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
    }
} 