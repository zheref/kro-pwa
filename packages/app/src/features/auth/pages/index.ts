/**
 * The auth feature's render tier (KC-IS-#32) — the surface KC-IS-#31's slice
 * drives, and the dialog its local-data arm presents.
 *
 * A pure re-export barrel. The slice tier is KC-IS-#31's and is exported from
 * its own modules; nothing here re-exports it.
 */
export {
  type AuthSurfaceFragmentProps,
  AuthSurfaceFragment,
} from './AuthSurfaceFragment'
export {
  type AuthSurfacePageProps,
  AuthSurfacePage,
  currentOrigin,
} from './AuthSurfacePage'
export {
  type LocalDataDialogFragmentProps,
  LocalDataDialogFragment,
} from './LocalDataDialogFragment'
export { AppleMark, GoogleMark } from './ProviderMarks'
