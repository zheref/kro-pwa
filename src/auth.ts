import { AuthOptions, getServerSession } from "next-auth"
import GoogleProvider from "next-auth/providers/google";

const authOptions: AuthOptions = {
    // Configure one or more authentication providers
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
            authorization: {
                params: {
                    scope: 'openid email profile https://www.googleapis.com/auth/calendar'
                }
            }
        }),
        // ...add more providers here
    ],
    callbacks: {
        jwt: async ({ token, account }) => {
            // Initial sign in
            if (account) {
                return {
                    ...token,
                    provider: account.provider,
                    accessToken: account.access_token,
                }
            }
            return token
        },
        session: async ({ session, token }) => {
            return {
                ...session,
                accessToken: token.accessToken,
                provider: token.provider,
            }
        },
    },
}

/**
 * Helper function to get the session on the server without having to import the authOptions object every single time
 * @returns The session object or null
 */
const getAuthSession = () => getServerSession(authOptions)

export { authOptions, getAuthSession }