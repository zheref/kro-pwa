import { describe, expect, it } from 'vitest'
import {
  OAUTH_RETURN_PARAMETERS,
  oauthReturnQueryString,
} from '../oauthReturnQuery'

describe('oauthReturnQueryString', () => {
  it('forwards the PKCE code Supabase appends on a provider return', () => {
    expect(oauthReturnQueryString({ code: 'abc-123' })).toBe('code=abc-123')
  })

  it('forwards a provider refusal with its description, percent-encoded', () => {
    expect(
      oauthReturnQueryString({
        error: 'access_denied',
        error_description: 'no / thanks',
      }),
    ).toBe('error=access_denied&error_description=no+%2F+thanks')
  })

  it('drops every other parameter, so nothing else reaches a Location header or a log', () => {
    expect(oauthReturnQueryString({ utm_source: 'x', foo: ['1', '2'] })).toBe(
      '',
    )
  })

  it('keeps a repeated return parameter and ignores an undefined one', () => {
    expect(oauthReturnQueryString({ code: ['a', 'b'], state: undefined })).toBe(
      'code=a&code=b',
    )
  })

  it('names exactly the four parameters an OAuth return may carry', () => {
    expect(OAUTH_RETURN_PARAMETERS).toEqual([
      'code',
      'state',
      'error',
      'error_description',
    ])
  })
})
