/**
 * The query parameters an OAuth provider return may carry through the front
 * door, and nothing else.
 *
 * Supabase Auth returns to the address it was given with `?code=` (PKCE) and
 * may add `state`, or `error` + `error_description` when the provider refused.
 * The `/` route forwards exactly these into the landing destination, so the
 * exchange the client performs is not stranded one redirect short — and it
 * forwards no other parameter, so an arbitrary query never rides through the
 * server tier into a `Location` header or an access log (`SEC-5`). The
 * destination itself is a fixed literal at the call site; this function only
 * builds the query string.
 */
export const OAUTH_RETURN_PARAMETERS: readonly string[] = [
  'code',
  'state',
  'error',
  'error_description',
]

export type SearchParamsLike = Readonly<
  Record<string, string | readonly string[] | undefined>
>

/** The forwarded query string, without its leading `?`; empty when nothing is forwarded. */
export const oauthReturnQueryString = (params: SearchParamsLike): string => {
  const query = new URLSearchParams()
  for (const name of OAUTH_RETURN_PARAMETERS) {
    const value = params[name]
    if (Array.isArray(value)) {
      for (const each of value) query.append(name, each)
    } else if (typeof value === 'string') {
      query.append(name, value)
    }
  }
  return query.toString()
}
