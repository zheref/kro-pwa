/**
 * The address a visitor writes to, to be removed from the early-access list.
 * A deployment value (`NEXT_PUBLIC_CONTACT_EMAIL`): the repository is public and
 * is never the removal path. Pure — the env is a parameter.
 */
export type ContactEnv = {
  readonly NEXT_PUBLIC_CONTACT_EMAIL?: string | undefined
}

const LOOKS_LIKE_ADDRESS = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The trimmed address when it looks like one, else `null`. */
export function contactEmail(
  env: ContactEnv = {
    NEXT_PUBLIC_CONTACT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  },
): string | null {
  const value = env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() ?? ''
  return LOOKS_LIKE_ADDRESS.test(value) ? value : null
}
