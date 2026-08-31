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
import type { CSSProperties, ReactNode } from 'react'
import { GlassSurface } from '../../../design/system/glass/GlassSurface'
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
  SESSION_GLASS_OVERRIDES,
  SESSION_PRESENTATION_SIZE,
  SessionSurfacePresentation,
  sessionSurfaceMaterial,
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

  /**
   * Canon's `glassSheetPresentation(material: .thin, tint:, colorScheme:
   * .dark)`, as one style object: the dark material, and the forced scheme that
   * makes the view's hardcoded-white copy legible. `data-theme` is the exact
   * attribute the tokens key their overrides off (`THEME_ATTRIBUTE`), so this is
   * the design system's own mechanism rather than a second one.
   */
  const material: CSSProperties = {
    ['--kro-glass-surface' as string]: sessionSurfaceMaterial(tint),
  }

  if (presentation === SessionSurfacePresentation.inline) {
    return (
      <GlassSurface
        as="section"
        material="surface"
        data-theme="dark"
        data-kro-session-surface="inline"
        aria-label={SURFACE_TITLE}
        className={cn(
          'relative mx-auto flex w-full flex-col overflow-hidden',
          className,
        )}
        style={{
          // The panel takes the material WITHOUT the tint: canon washes the
          // side panel's hue with `presentationBackground`'s downward gradient
          // instead (below), and layering both would double it.
          ['--kro-glass-surface' as string]: sessionSurfaceMaterial(null),
          minWidth: SESSION_PRESENTATION_SIZE.session.minWidth,
          maxWidth: SESSION_PRESENTATION_SIZE.session.maxWidth,
        }}
      >
        {/*
          Canon's `presentationBackground` — the side panel's own top-down
          gradient from the phase's `detailTint` into nothing, over the material
          above. Decorative, so it is aria-hidden and never intercepts a tap.
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
      </GlassSurface>
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
          data-theme="dark"
          data-kro-session-surface="sheet"
          aria-describedby={undefined}
          // The content brings canon's own close button in its header, with
          // canon's two labels; a second one from the primitive would be a
          // duplicate control announcing the wrong thing.
          hideClose
          className={cn('max-h-[92vh] overflow-y-auto px-0 pb-0', className)}
          // The positioning is inline because the class would lose — see
          // `SESSION_GLASS_OVERRIDES`. Without it the sheet renders in flow and
          // never appears at the bottom edge at all.
          style={{
            ...material,
            ...SESSION_GLASS_OVERRIDES.sheet,
            borderRadius: 'var(--kro-radius-surface) var(--kro-radius-surface) 0 0',
          }}
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
        data-theme="dark"
        data-kro-session-surface="modal"
        hideClose
        className={cn('max-h-[92vh] overflow-y-auto px-0 pb-0', className)}
        // Same reason as the sheet above: `fixed top-1/2 left-1/2` loses to
        // `.kro-glass { position: relative }`, and the modal drops into flow.
        style={{
          ...material,
          ...SESSION_GLASS_OVERRIDES.modal,
          minWidth: SESSION_PRESENTATION_SIZE.session.minWidth,
          maxWidth: SESSION_PRESENTATION_SIZE.session.maxWidth,
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
