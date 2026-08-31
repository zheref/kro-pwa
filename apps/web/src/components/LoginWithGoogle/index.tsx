'use client'

import React from 'react'
import { Button } from '@chakra-ui/react'

/**
 * This button used to call NextAuth's `signIn('google')`, which requested the
 * Google Calendar scope alongside the sign-in. KC-IS-#31 retires NextAuth, and
 * the replacement is two separate things rather than one: Kro Cloud sign-in is
 * Supabase (this issue), and the Google **Calendar** connection is a second
 * OAuth grant with a calendar scope that KC-IS-#33 owns.
 *
 * Until #33 lands there is no calendar flow to start, so the control says so
 * instead of doing nothing when pressed — a button that silently no-ops is
 * worse than one that is honestly unavailable. The Session UI child (KC-IS-#22)
 * replaces this surface; this is deliberately not a redesign.
 */
const LoginWithGoogleButton = () => (
  <Button
    p={3}
    variant="solid"
    disabled
    title="Google Calendar connection is not available yet."
  >
    Connect Google
  </Button>
)

export { LoginWithGoogleButton }
