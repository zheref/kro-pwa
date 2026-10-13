/**
 * The landing tier's typed failures (`RC-8`). A closed union with a factory,
 * never a raw `string` or `Error` in `State`. Both kinds are recoverable and
 * silent: analytics and the theme preference are conveniences, so neither ever
 * paints an error on the page — the Result simply says what happened.
 */
import { type Exception, exception } from '@kro/core'

export type LandingException =
  | Exception<'analyticsUnavailable'>
  | Exception<'themeUnavailable'>

export type LandingExceptionKind = LandingException['kind']

export const LandingExceptions = {
  analyticsUnavailable: (): LandingException =>
    exception(
      'analyticsUnavailable',
      'Analytics is not available, so this event was not recorded.',
      true,
    ),
  themeUnavailable: (): LandingException =>
    exception(
      'themeUnavailable',
      'The theme preference could not be saved on this device.',
      true,
    ),
}
