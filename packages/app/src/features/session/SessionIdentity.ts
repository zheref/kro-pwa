/**
 * The session's editable identity — the title and the glyph the sheet shows,
 * and the two pure rules canon attaches to editing them.
 *
 * Ported from canon `SessionSetupFeature.replacingSymbol(in:oldSymbol:newSymbol:)`
 * and `docs/Features/Session.md` § Editing identity from the sheet.
 *
 * Kept as pure functions over a value, exactly as canon keeps `replacingSymbol`
 * `static` "so it can be unit-tested directly without constructing a full
 * `State`".
 */
import {
  EndeavorHost,
  type Endeavor,
  type TimeIntervalSeconds,
  taskEndeavor,
} from '@kro/core'
import { ANONYMOUS_SESSION_SYMBOL, ANONYMOUS_SESSION_TITLE } from './SessionVocabulary'

/**
 * Who the session is *for*, as the sheet and the pill render it.
 *
 * `endeavorId` is always populated — even for a blank focus session, because
 * the anchor is keyed by it and the id must survive a reload. What a blank
 * session lacks is a **stored row**, and that is `isAnonymous`: canon keeps the
 * same distinction by holding an `EndeavorCardModel` in the sheet whose id is
 * not yet in `state.endeavors`.
 */
export interface SessionIdentity {
  readonly endeavorId: string
  readonly symbol: string
  readonly title: string
  /** The endeavor's own preferred duration, when it has one. */
  readonly duration: TimeIntervalSeconds | null
  /** `true` until a stored endeavor row backs `endeavorId`. */
  readonly isAnonymous: boolean
}

export const makeSessionIdentity = (params: {
  readonly endeavorId: string
  readonly symbol?: string
  readonly title?: string
  readonly duration?: TimeIntervalSeconds | null
  readonly isAnonymous?: boolean
}): SessionIdentity => ({
  endeavorId: params.endeavorId,
  symbol: params.symbol ?? ANONYMOUS_SESSION_SYMBOL,
  title: params.title ?? ANONYMOUS_SESSION_TITLE,
  duration: params.duration ?? null,
  isAnonymous: params.isAnonymous ?? false,
})

/**
 * The blank focus session every "Start Session" quick action raises — canon's
 * *"the user opens a blank focus session (no backing endeavor)"*.
 *
 * The id is the caller's: this tier mints no identity (`RC-3`; the same ruling
 * `CaptureProducer` records for captured endeavors).
 */
export const anonymousSessionIdentity = (id: string): SessionIdentity =>
  makeSessionIdentity({ endeavorId: id, isAnonymous: true })

/**
 * The glyph a title already carries, or `null` when it carries none.
 *
 * `Endeavor` has **no `symbol` field** — canon keeps the glyph on its UI-layer
 * `EndeavorCardModel`, where it is either the emoji the title opens with or one
 * inferred from keywords. There is no keyword table in this tier (and inventing
 * one would be product design, not a port), so the web reads the title's own
 * leading emoji and lets a caller override. That is precisely the case canon's
 * `replacingSymbol` calls out: *"the symbol had been keyword-inferred"*, i.e.
 * the title does not contain it, and the new glyph is prepended instead.
 *
 * `\p{Extended_Pictographic}` is an ES2018 Unicode property escape — no
 * dependency, and it matches the whole emoji family rather than a hand-listed
 * range. The surrounding `Emoji_Modifier`/ZWJ sequence is taken with it so a
 * skin-toned or joined emoji is not split mid-grapheme.
 */
const LEADING_SYMBOL_PATTERN =
  /^(\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?(?:‍\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier})?)*)/u

export const leadingSymbolOfTitle = (title: string): string | null =>
  LEADING_SYMBOL_PATTERN.exec(title)?.[1] ?? null

/**
 * The identity a stored endeavor presents to the sheet. `symbol` defaults to
 * the title's own leading glyph, then to the blank session's tomato.
 */
export const sessionIdentityForEndeavor = (
  endeavor: Endeavor,
  symbol?: string,
): SessionIdentity =>
  makeSessionIdentity({
    endeavorId: endeavor.id,
    symbol:
      symbol ?? leadingSymbolOfTitle(endeavor.title) ?? ANONYMOUS_SESSION_SYMBOL,
    title: endeavor.title,
    duration: endeavor.duration,
    isAnonymous: false,
  })

/**
 * Canon's `replacingSymbol` — a copy of `title` with `oldSymbol` replaced by
 * `newSymbol` **at its original position**, so `📊 Prepare slides` becomes
 * `💻 Prepare slides`.
 *
 * Canon's three branches, kept: an empty title becomes the symbol alone; a
 * title that carries the old symbol has it replaced in place; and a title that
 * never carried it (the symbol was keyword-inferred) gets the new one prepended
 * with a single space.
 *
 * `String.prototype.replace` with a **string** pattern replaces the first
 * occurrence only and treats the pattern literally, which is exactly Swift's
 * `range(of:)` + `replacingCharacters(in:with:)` pair. Using a `RegExp` here
 * would make an emoji containing a regex metacharacter — or a title containing
 * `$&` — behave differently on the two platforms.
 */
export const replacingSymbolInTitle = (params: {
  readonly title: string
  readonly oldSymbol: string
  readonly newSymbol: string
}): string => {
  const { title, oldSymbol, newSymbol } = params
  if (title.length === 0) return newSymbol
  if (oldSymbol.length > 0 && title.includes(oldSymbol)) {
    return title.replace(oldSymbol, () => newSymbol)
  }
  return `${newSymbol} ${title}`
}

/** Canon's `trimmingCharacters(in: .whitespacesAndNewlines)`. */
export const trimSessionTitle = (title: string): string => title.trim()

/**
 * Whether a title edit is worth committing — canon's
 * `guard !trimmed.isEmpty, trimmed != state.endeavor.title`.
 *
 * A blank or unchanged title reverts rather than persisting, so an accidental
 * tap on the title never wipes an endeavor's name.
 */
export const isCommittableSessionTitle = (
  identity: SessionIdentity,
  editedTitle: string,
): boolean => {
  const trimmed = trimSessionTitle(editedTitle)
  return trimmed.length > 0 && trimmed !== identity.title
}

/** The identity after a committed title edit. */
export const identityWithTitle = (
  identity: SessionIdentity,
  title: string,
): SessionIdentity => ({ ...identity, title: trimSessionTitle(title) })

/**
 * The identity after picking a glyph — canon's `userDidPickSymbol`: the symbol
 * changes **and** the title's own copy of it is replaced in place.
 *
 * An empty or unchanged pick is canon's `guard !newSymbol.isEmpty, newSymbol
 * != oldSymbol else { return .none }` — the same identity object comes back, so
 * a caller can compare by reference and skip the write entirely.
 */
export const identityWithSymbol = (
  identity: SessionIdentity,
  newSymbol: string,
): SessionIdentity => {
  if (newSymbol.length === 0 || newSymbol === identity.symbol) return identity
  return {
    ...identity,
    symbol: newSymbol,
    title: replacingSymbolInTitle({
      title: identity.title,
      oldSymbol: identity.symbol,
      newSymbol,
    }),
  }
}

/**
 * The endeavor a blank focus session is **promoted** into once the user edits
 * its title or its symbol — `docs/Features/Session.md`: *"the act commits a
 * real endeavor with the resulting title — so picking `💻` on the default
 * 'Focus Session' creates an endeavor titled `💻 Focus Session`"*.
 *
 * Canon builds `Endeavor.task(id:title:host: .local)`, and so does this: the
 * promoted row is Kro-owned, carries the session's own id (so the anchor
 * already written for it stays valid), and inherits the identity's duration
 * when one was configured.
 */
export const promotedEndeavorForIdentity = (
  identity: SessionIdentity,
  now: Date,
): Endeavor =>
  taskEndeavor({
    id: identity.endeavorId,
    title: identity.title,
    duration: identity.duration,
    host: EndeavorHost.local,
    createdAt: now,
  })
