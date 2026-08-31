import { NextResponse } from 'next/server'
import { google } from 'googleapis'

/**
 * The caller's Google Calendar access token, or `null` when there is none.
 *
 * NextAuth was the only source of one, and KC-IS-#31 retires it: Kro Cloud auth
 * is Supabase now, and the Google **Calendar** connection — a second OAuth
 * grant carrying the `calendar` scope — is KC-IS-#33's, not this issue's. Until
 * #33 lands there is no token, so this returns `null` and the handler answers
 * `401`: exactly the answer it already gave an unauthenticated caller, rather
 * than a 500 from a deleted import.
 *
 * The handler below is otherwise untouched, so #33 replaces one function rather
 * than reconstructing a route.
 */
const googleCalendarAccessToken = (): string | null => null

export async function POST(request: Request) {
  const accessToken = googleCalendarAccessToken()

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const auth = new google.auth.OAuth2()

  auth.setCredentials({
    access_token: accessToken,
  })

  const body = await request.json()

  const event = {
    summary: body.title,
    start: {
      dateTime: body.start,
      timeZone: body.timezone,
    },
    end: {
      dateTime: body.end,
      timeZone: body.timezone,
    },
  }

  const calendar = google.calendar({ version: 'v3', auth })

  try {
    const response = await calendar.events.insert(
      {
        calendarId: 'primary',
        requestBody: event,
      },
      undefined,
    )

    return NextResponse.json(response.data)
  } catch (error) {
    console.error('Error creating calendar event:', error)
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 },
    )
  }
}
