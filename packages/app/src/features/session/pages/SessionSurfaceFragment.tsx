'use client'

/**
 * Where the session surface is hosted — the container half of the port, split
 * from the content half so the content can be snapshotted without a portal.
 *
 * A pure Fragment (`RC-15`): no store, no dispatch, no width measurement. Which
 * host to use is decided by the Page from the shell's own decision table, so the
 * shell and this surface can never disagree about what "desktop" means.
 *
 * ==========================================================================
 * THE THREE HOSTS, AND THE CANON THEY COME FROM
 * ==========================================================================
 *
 * | here     | canon                                    | when                    |
 * |----------|------------------------------------------|-------------------------|
 * | `sheet`  | `glassSheetPresentation` (iPhone/iPad)    | the tab-bar shell       |
 * | `modal`  | the raised `.sheet(item: sessionSetup)`   | the sidebar shell       |
 * | `inline` | `TrailingDetailPanel` (macOS side panel)  | the `/execute` route    |
 *
 * **A named divergence, because canon moved.** The epic pinned
 * `zheref/KroApple@2c1ee45`; at `@2117efc` — `origin/main` when this was built —
 * canon had replaced the macOS raised sheet with a *page-owned glass side
 * panel* (`SessionSetupPresentation.sidePanel`, `MainScreen.wideNavigationBody`),
 * and `docs/Features/Session.md` now says *"a glass sheet on iPhone and iPad, or
 * an automatically opened glass side panel layered above the current macOS
 * page"*. The web has both shapes and needs both: `/execute` **is** a page, so
 * it hosts the panel inline; a session raised from anywhere else has no page to
 * own it, so it is a modal at the frame the shell pins
 * (`PRESENTATION_SIZE.session` — `minWidth: 360, maxWidth: 640`). The issue's own
 * wording ("desktop min 360 / max 640 modal vs mobile bottom sheet per the shell
 * constants") is what the modal implements; the inline column is what canon's
 * newer side panel maps onto.
 *
 * ==========================================================================
 * THE TINT
 * ==========================================================================
 *
 * `SessionSetupScreen.tintForPhase` tints the *sheet material*;
 * `SessionSetupView.presentationBackground` paints a top-down gradient from
 * `detailTint` to clear behind the *panel*. `sessionSurfaceTint` returns the one
 * hue both are built from, so the two hosts cannot drift apart — the sheet and
 * the modal wash their glass with it, the inline column fades it downward.
 */
import type { ReactNode } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '../../../design/system/primitives/dialog'
import {
  Sheet,
  SheetContent,
} from '../../../design/system/primitives/sheet'
import { cn } from '../../../design/system/utils/cn'
import type { SessionPhase } from '../SessionVocabulary'
import {
  SESSION_PRESENTATION_SIZE,
  SessionSurfacePresentation,
  sessionSurfaceTint,
} from './sessionSheetModel'

export interface SessionSurfaceFragmentProps {
  readonly presentation: SessionSurfacePresentation
  /** Ignored by `inline`, which is a page and is never "closed". */
  readonly isOpen: boolean
  readonly onRequestClose: () => void
  /** Drives the tint only; the content owns everything else about the phase. */
  readonly phase: SessionPhase
  /** The sheet's content — `SessionSheetFragment`, in practice. */
  readonly children: ReactNode
  readonly className?: string
}

/** Canon's accessible name for the surface, shared by all three hosts. */
const SURFACE_TITLE = 'Focus session'
const SURFACE_DESCRIPTION =
  'Set the duration, start the session, and choose what happens when it ends.'

export function SessionSurfaceFragment({
  presentation,
  isOpen,
  onRequestClose,
  phase,
  children,
  className,
}: SessionSurfaceFragmentProps) {
  const tint = sessionSurfaceTint(phase)

  if (presentation === SessionSurfacePresentation.inline) {
    return (
      <section
        data-kro-session-surface="inline"
        aria-label={SURFACE_TITLE}
        className={cn(
          'relative mx-auto flex w-full flex-col',
          className,
        )}
        style={{
          minWidth: SESSION_PRESENTATION_SIZE.session.minWidth,
          maxWidth: SESSION_PRESENTATION_SIZE.session.maxWidth,
        }}
      >
        {/*
          Canon's `presentationBackground` — a top-down gradient from the
          phase's `detailTint` into nothing. Decorative, so it is aria-hidden
          and never intercepts a tap.
        */}
        {tint === null ? null : (
          <div
            aria-hidden="true"
            data-kro-session-surface-tint=""
            className="pointer-events-none absolute inset-x-0 top-0 h-1/2"
            style={{ background: `linear-gradient(${tint}, transparent)` }}
          />
        )}
        <div className="relative">{children}</div>
      </section>
    )
  }

  if (presentation === SessionSurfacePresentation.sheet) {
    return (
      <Sheet
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onRequestClose()
        }}
      >
        <SheetContent
          side="bottom"
          data-kro-session-surface="sheet"
          aria-describedby={undefined}
          // The content brings canon's own close button in its header, with
          // canon's two labels; a second one from the primitive would be a
          // duplicate control announcing the wrong thing.
          hideClose
          className={cn('max-h-[92vh] overflow-y-auto px-0 pb-0', className)}
          style={tint === null ? undefined : { backgroundColor: tint }}
        >
          <DialogTitle className="sr-only">{SURFACE_TITLE}</DialogTitle>
          <DialogDescription className="sr-only">
            {SURFACE_DESCRIPTION}
          </DialogDescription>
          {children}
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onRequestClose()
      }}
    >
      <DialogContent
        data-kro-session-surface="modal"
        hideClose
        className={cn('max-h-[92vh] overflow-y-auto px-0 pb-0', className)}
        style={{
          minWidth: SESSION_PRESENTATION_SIZE.session.minWidth,
          maxWidth: SESSION_PRESENTATION_SIZE.session.maxWidth,
          ...(tint === null ? {} : { backgroundColor: tint }),
        }}
      >
        <DialogTitle className="sr-only">{SURFACE_TITLE}</DialogTitle>
        <DialogDescription className="sr-only">
          {SURFACE_DESCRIPTION}
        </DialogDescription>
        {children}
      </DialogContent>
    </Dialog>
  )
}
