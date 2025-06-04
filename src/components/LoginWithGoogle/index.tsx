'use client'

import React from 'react'
import { Button } from '@chakra-ui/react'
import { signIn } from 'next-auth/react'

const LoginWithGoogleButton = () => {
    const authLogin = () => { signIn('google') }

    return <Button p={3} variant="solid" onClick={authLogin}>Connect Google</Button>
}

export { LoginWithGoogleButton }