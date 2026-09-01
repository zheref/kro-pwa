'use client'

/**
 * The Profile control, and the two surfaces that must be reachable from
 * anywhere (`RC-37`; implements `UZF-4`).
 *
 * Three things live here because all three are shell-wide rather than
 * destination-scoped:
 *
 * 1. **The profile popover** — canon's `macProfileButton` + `ProfilePopoverView`,
 *    portalled into the shell's `profile` toolbar slot. Desktop gets canon's
 *    popover at width 300; a handheld gets a sheet, because canon's own rule is
 *    that a popover on a narrow surface "would adapt into a full-screen sheet
 *    and cost more than it gives". The decision comes from
 *    `presentationFor(...)`, the same table the rest of the shell reads.
 * 2. **The auth sheet** — reachable from the popover *and* from the Settings
 *    hub's signed-out row, so it cannot live inside either.
 * 3. **The existing-local-data dialog** — it appears after a sign-in that may
 *    have completed through an OAuth redirect landing on any route, so it has
 *    no destination to belong to.
 *
 * The Page reads across three slices — `settings` for the presentation,
 * `auth` for the session and the dialog, `main` for the surface — and does so
 * through each feature's own named Selectors, never by reaching into a shape
 * (`RC-20`).
 */
import { primaryEmail } from '@kro/core'
import { type ComponentPropsWithoutRef, useCallback, useEffect } from 'react'
import { AuthSurfacePage } from '../../auth/pages/AuthSurfacePage'
import { LocalDataDialogFragment } from '../../auth/pages/LocalDataDialogFragment'
import { onLocalDataDialogDismissed } from '../../auth/AuthFeature'
import type { LocalDataChoice } from '../../auth/LocalDataDialog'
import {
  resolveLocalDataChoiceThunk,
  restoreSessionThunk,
  signOutThunk,
} from '../../auth/AuthProducer'
import {
  selectCurrentUser,
  selectLocalDataDialog,
  selectUserInitials,
} from '../../auth/AuthSelectors'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../design/system/primitives/dialog'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../../design/system/primitives/popover'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '../../../design/system/primitives/sheet'
import { ICON_SIZE } from '../../../design/system/icons/icons'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import {
  PRESENTATION_SIZE,
  PresentationSurface,
  presentationFor,
} from '../../main/MainPresentation'
import { navigateToDestinationThunk } from '../../main/MainProducer'
import { selectSurface } from '../../main/MainSelectors'
import { DestinationKind } from '../../main/SidebarDestination'
import { ToolbarSlot } from '../../main/ToolbarSlots'
import { userDidDismissAuth, userDidTapSignIn } from '../SettingsFeature'
import { selectAuthPresentation } from '../SettingsSelectors'
import { SUBSCRIPTION_PLAN_NAME } from '../SettingsState'
import { Avatar } from './SettingsHubFragment'
import { ProfilePopoverFragment } from './ProfilePopoverFragment'

export function ProfileControlPage() {
  const dispatch = useAppDispatch()

  const user = useAppSelector(selectCurrentUser)
  const initials = useAppSelector(selectUserInitials)
  const localData = useAppSelector(selectLocalDataDialog)
  const authPresentation = useAppSelector(selectAuthPresentation)
  const surface = useAppSelector(selectSurface)

  const presentation = presentationFor(PresentationSurface.profile, surface)
  const isSheet = presentation.kind === 'sheet'

  /*
    The silent launch restore (KC-IS-#31's `restoreSessionThunk`).

    Fired here because this is the one artifact mounted once, shell-wide, that
    *renders* the session — so the surface that shows who you are is the surface
    that asks. Without it `session` stays `unknown` forever in the running app
    and every reload would render the signed-out control for an account that is
    in fact signed in.

    `observeAuthState` — the `onAuthStateChange` subscription that catches a
    token refresh or a sign-out in a second tab — is deliberately NOT wired
    here: it needs `ThunkExtra`, which a component may not reach (`RC-6`), so it
    belongs to `apps/web`'s composition root. Named in the PR body as an open
    cross-lane need.
  */
  useEffect(() => {
    const effect = dispatch(restoreSessionThunk({ now: new Date() }))
    return () => effect.abort()
  }, [dispatch])

  const goTo = useCallback(
    (kind: 'tasks' | 'settings') => {
      void dispatch(
        navigateToDestinationThunk({
          destination:
            kind === 'tasks'
              ? { kind: DestinationKind.allTasks }
              : { kind: DestinationKind.settings },
        }),
      )
    },
    [dispatch],
  )

  const content = (
    <ProfilePopoverFragment
      accountName={user?.name ?? null}
      accountEmail={user === null ? null : primaryEmail(user)}
      accountInitials={initials}
      planName={SUBSCRIPTION_PLAN_NAME}
      onTapSignIn={() =>
        dispatch(userDidTapSignIn({ origin: 'profilePopover' }))
      }
      onTapAllEndeavors={() => goTo('tasks')}
      onTapSettings={() => goTo('settings')}
      onTapSignOut={() => {
        void dispatch(signOutThunk())
      }}
    />
  )

  return (
    <>
      <ToolbarSlot placement="profile">
        {isSheet ? (
          <Sheet>
            <SheetTrigger asChild>
              <ProfileTrigger initials={initials} isSignedIn={user !== null} />
            </SheetTrigger>
            <SheetContent side="bottom" className="p-0">
              <SheetTitle className="sr-only">Profile</SheetTitle>
              {content}
            </SheetContent>
          </Sheet>
        ) : (
          <Popover>
            <PopoverTrigger asChild>
              <ProfileTrigger initials={initials} isSignedIn={user !== null} />
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="p-0"
              // Canon's `.frame(width: 300)` on `ProfilePopoverView`, read from
              // the design system's own table so a second surface cannot
              // disagree about what "the profile popover" is.
              style={{ width: PRESENTATION_SIZE.profile.width }}
            >
              {content}
            </PopoverContent>
          </Popover>
        )}
      </ToolbarSlot>

      {/*
        The auth surface. A modal on every shell — canon presents it with
        `.fullScreenCover` on the phone and a sheet on the Mac, which are the
        same thing here: a centred panel over a scrim, sized to the content.
      */}
      <Dialog
        open={authPresentation.kind === 'presented'}
        onOpenChange={(next) => {
          if (!next) dispatch(userDidDismissAuth())
        }}
      >
        <DialogContent
          hideClose
          data-testid="auth-modal"
          /*
            A height cap, a scroll and top-anchoring, so the panel cannot run
            off the bottom on a short viewport (a laptop in landscape, a phone
            with the keyboard up). Measured on the built app.
          */
          className={cn(
            'top-[3dvh] max-h-[94dvh] translate-y-0 overflow-y-auto',
            'max-w-[420px] border-0 bg-transparent p-0 shadow-none',
          )}
        >
          <DialogTitle className="sr-only">Sign in to Kro</DialogTitle>
          <DialogDescription className="sr-only">
            Sign in with your email, with Apple, or with Google.
          </DialogDescription>
          <AuthSurfacePage onDismiss={() => dispatch(userDidDismissAuth())} />
        </DialogContent>
      </Dialog>

      <LocalDataDialogFragment
        isPresented={localData.kind === 'shown'}
        anonymousCount={
          localData.kind === 'shown' ? localData.anonymousCount : 0
        }
        isResolving={localData.kind === 'resolving'}
        onChoose={(choice: LocalDataChoice) => {
          void dispatch(
            resolveLocalDataChoiceThunk({ choice, now: new Date() }),
          )
        }}
        // Canon routes swipe-to-dismiss into the same arm as Cancel; this only
        // hides the prompt and touches no rows, which is what the slice's own
        // `onLocalDataDialogDismissed` does.
        onDismiss={() => dispatch(onLocalDataDialogDismissed())}
      />

      <AuthDismissOnSignIn />
    </>
  )
}

/**
 * Closes the auth surface once a session exists.
 *
 * A one-line effect rather than a reducer matching `auth`'s thunk: a slice that
 * reacted to another feature's lifecycle would be reaching into it (`RC-20`),
 * and the Page is the artifact allowed to bridge the two (`RC-37`).
 */
function AuthDismissOnSignIn() {
  const dispatch = useAppDispatch()
  const user = useAppSelector(selectCurrentUser)
  const authPresentation = useAppSelector(selectAuthPresentation)
  const isPresented = authPresentation.kind === 'presented'

  useEffect(() => {
    if (user !== null && isPresented) dispatch(userDidDismissAuth())
  }, [dispatch, isPresented, user])

  return null
}

/**
 * The toolbar button itself.
 *
 * Signed in it is the initials avatar, which is what makes the control read as
 * *your* account at a glance; signed out it is the neutral person glyph the
 * shell drew before. `forwardRef` is not needed — Radix's `asChild` clones the
 * element and React 19 passes `ref` as an ordinary prop.
 */
function ProfileTrigger({
  initials,
  isSignedIn,
  ...rest
}: {
  readonly initials: string
  readonly isSignedIn: boolean
} & ComponentPropsWithoutRef<'button'>) {
  return (
    <button
      type="button"
      aria-label="Profile"
      data-testid="profile-control"
      className={cn(
        'flex items-center justify-center rounded-kro-pill',
        'outline-none focus-visible:shadow-[var(--kro-ring)]',
      )}
      style={{
        minWidth: ICON_SIZE.large,
        minHeight: ICON_SIZE.large,
        color: colorVar('fore'),
      }}
      {...rest}
    >
      <Avatar initials={initials} isSignedIn={isSignedIn} size={28} />
    </button>
  )
}
