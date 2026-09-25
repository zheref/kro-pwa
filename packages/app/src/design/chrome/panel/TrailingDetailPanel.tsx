'use client'

/**
 * The window's trailing glass detail surface — canon
 * `KroUI/Components/TrailingDetailPanel.swift` in its `.overlay` layout, plus
 * the `DetailPaneScaffold` header `MainScreen` wraps pushed screens in.
 *
 * Domain-less (`RC-14`): a title, an optional subtitle, a dismiss closure and
 * a body. It never learns what a segment or an endeavor is.
 *
 * ## Geometry, ported number for number
 *
 * Canon's `TrailingDetailPanelGeometry.panelWidth` is
 * `min(max(w * 0.36, 320), min(520, w * 0.52))`, the surface sits 96pt below
 * the window's top edge and 16pt in from its trailing and bottom edges, its
 * corners are a 28pt continuous rect, and it floats OVER the page (`.overlay`)
 * rather than taking width from it. `w` is the window, so the CSS reads
 * viewport units — the shell that mounts this spans the viewport.
 *
 * ## Motion
 *
 * Slides in from the trailing edge with an opacity change on
 * `KroTokens.Motion.standardSpring` (the design system's
 * `--kro-ease-standard-spring`), and does not animate at all under Reduce
 * Motion — canon's `reduceMotion ? nil : …`. While hidden it takes no hits and
 * is hidden from assistive tech, as canon's `allowsHitTesting` /
 * `accessibilityHidden` pair does.
 *
 * ## Escape
 *
 * Canon has no Escape binding on its pane (`MacDetailPane.md`). The web adds
 * one — Escape is the platform's dismiss key for a floating surface — and
 * leaves it to an Escape nobody else claimed: a dialog or a menu opened from
 * inside the pane closes first.
 */
import {
  type CSSProperties,
  type ComponentPropsWithoutRef,
  type ReactNode,
  useEffect,
} from 'react'
import { drillAnimation, useDrillDirection } from './DrillTransition'
import { endeavorIcon } from '../../endeavor/endeavorIcons'
import { colorVar } from '../../system/tokens/roles'
import { GlassSurface } from '../../system/glass/GlassSurface'
import { cn } from '../../system/utils/cn'

const CloseGlyph = endeavorIcon('xmark')
const BackGlyph = endeavorIcon('chevron.left')

/** Canon's `TrailingDetailPanel` defaults, as written in its initializer. */
export const DETAIL_PANEL_GEOMETRY = {
  topInset: 96,
  minimumWidth: 320,
  maximumWidth: 520,
  preferredWidthFraction: 0.36,
  maximumWidthFraction: 0.52,
  trailingMargin: 16,
  bottomMargin: 16,
  accessoryPanelSpacing: 12,
  cornerRadius: 28,
} as const

/** Canon's `TrailingDetailPanelGeometry.panelWidth`, for a window `width` wide. */
export function detailPanelWidth(width: number): number {
  const g = DETAIL_PANEL_GEOMETRY
  return Math.min(
    Math.max(width * g.preferredWidthFraction, g.minimumWidth),
    Math.min(g.maximumWidth, width * g.maximumWidthFraction),
  )
}

/** The same formula in CSS, against the viewport the shell spans. */
export const DETAIL_PANEL_WIDTH_CSS = `min(max(${
  DETAIL_PANEL_GEOMETRY.preferredWidthFraction * 100
}vw, ${DETAIL_PANEL_GEOMETRY.minimumWidth}px), ${
  DETAIL_PANEL_GEOMETRY.maximumWidth
}px, ${DETAIL_PANEL_GEOMETRY.maximumWidthFraction * 100}vw)`

/**
 * The custom property a bottom-trailing accessory (the FAB) reads to step
 * aside — canon's `trailingMargin + (isPresented ? panelWidth + 12 : 0)`,
 * less the trailing margin the accessory already carries. `0px` when hidden.
 */
export const DETAIL_PANEL_ACCESSORY_INSET_VAR = '--kro-detail-panel-inset'

/** What the accessory adds to its own trailing inset. */
export const DETAIL_PANEL_ACCESSORY_INSET = `var(${DETAIL_PANEL_ACCESSORY_INSET_VAR}, 0px)`

/** The value the shell publishes for `DETAIL_PANEL_ACCESSORY_INSET_VAR`. */
export function detailPanelAccessoryInset(isPresented: boolean): string {
  return isPresented
    ? `calc(${DETAIL_PANEL_WIDTH_CSS} + ${DETAIL_PANEL_GEOMETRY.accessoryPanelSpacing}px)`
    : '0px'
}

export interface TrailingDetailPanelProps {
  readonly isPresented: boolean
  /** The header's title — `DetailPaneScaffold.title`. */
  readonly title: string
  /** The header's subtitle, when the surface is reading one thing. */
  readonly subtitle?: string | null
  /** The header's leading dismiss control, and Escape. */
  readonly onDismiss: () => void
  /**
   * Distance from the window's top edge, in px. Defaults to canon's 96; the
   * shell passes the bottom of the page's large title plus the bottom margin,
   * so the panel starts where the title ends.
   */
  readonly topInset?: number
  /**
   * Replaces the title and subtitle as the header's centred content — a
   * segmented control, say (the session's mode toggle as its navigation title).
   * The title still names the panel for assistive tech.
   */
  readonly titleContent?: ReactNode
  /**
   * Drill-in navigation: when given, the header's leading control is Back
   * (and Escape goes back) instead of Close. The pane shows a pushed reading.
   */
  readonly onBack?: (() => void) | null
  /**
   * The drill-in depth — 0 at a top-level reading. A change of depth replays
   * the body's slide: deeper slides in from the trailing edge, shallower from
   * the leading one.
   */
  readonly navigationDepth?: number
  /** Identifies the reading shown; a change re-keys the body's transition. */
  readonly navigationKey?: string
  /**
   * Replaces the header's leading control — a reading's own sub-screen Back
   * (Endeavor Detail's editors). Wins over `onBack` and the close.
   */
  readonly leadingAccessory?: ReactNode
  /**
   * A decorative layer painted from the panel's own top edge, behind the
   * header and the body — a reading's colour wash. From the top, not from
   * where the content starts, so a centred body leaves no untinted band that
   * reads as a taller header.
   */
  readonly backdrop?: ReactNode
  /** A control on the header's trailing side (a toolbar item). */
  readonly trailingAccessory?: ReactNode
  readonly children?: ReactNode
  readonly className?: string
}

/** The large title's bottom edge becomes the panel's top, plus this. */
export const LARGE_TITLE_SELECTOR = '[data-kro-large-title]'

export function TrailingDetailPanel({
  isPresented,
  title,
  subtitle,
  onDismiss,
  topInset,
  titleContent,
  trailingAccessory,
  onBack = null,
  leadingAccessory,
  backdrop,
  navigationDepth = 0,
  navigationKey,
  children,
  className,
}: TrailingDetailPanelProps) {
  useEffect(() => {
    if (!isPresented) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      // Drilled in, Escape steps back a level; at the top it closes.
      if (onBack) onBack()
      else onDismiss()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isPresented, onBack, onDismiss])

  // Which way the last navigation went, for the body's slide.
  const direction = useDrillDirection(navigationDepth)

  const leading = leadingAccessory ? (
    leadingAccessory
  ) : onBack ? (
    <PanelToolbarButton label="Back" onPress={onBack}>
      <BackGlyph {...PANEL_TOOLBAR_GLYPH} />
    </PanelToolbarButton>
  ) : (
    <PanelToolbarButton label="Close" onPress={onDismiss}>
      <CloseGlyph {...PANEL_TOOLBAR_GLYPH} />
    </PanelToolbarButton>
  )

  const g = DETAIL_PANEL_GEOMETRY
  const style: CSSProperties = {
    top: topInset ?? g.topInset,
    right: g.trailingMargin,
    bottom: g.bottomMargin,
    width: DETAIL_PANEL_WIDTH_CSS,
    borderRadius: g.cornerRadius,
    opacity: isPresented ? 1 : 0,
    transform: isPresented
      ? 'translateX(0)'
      : `translateX(calc(100% + ${g.trailingMargin}px))`,
    transitionProperty: 'transform, opacity',
    transitionDuration: 'var(--kro-duration-standard-spring)',
    transitionTimingFunction: 'var(--kro-ease-standard-spring)',
    // Canon's `.shadow(color: .black.opacity(0.24), radius: 18, x: -6)`.
    boxShadow: '-6px 0 36px rgb(0 0 0 / 0.24)',
  }

  return (
    <GlassSurface
      as="aside"
      material="surface"
      aria-label={title}
      aria-hidden={!isPresented}
      inert={!isPresented}
      data-testid="trailing-detail-panel"
      data-presented={isPresented ? 'true' : 'false'}
      className={cn(
        'absolute z-30 flex min-h-0 flex-col overflow-hidden',
        'motion-reduce:transition-none',
        !isPresented && 'pointer-events-none',
        className,
      )}
      style={style}
    >
      {backdrop ? (
        <div
          aria-hidden="true"
          data-testid="trailing-detail-panel-backdrop"
          className="pointer-events-none absolute inset-x-0 top-0 z-0"
        >
          {backdrop}
        </div>
      ) : null}
      {/*
        One header shape for every reading: the close leading, then either the
        title (with its subtitle) or a centred title content, then the trailing
        toolbar item. Both toolbar buttons are the same glass circle — canon's
        `LiquidGlassCircleButton` on either side of the pane's header.
      */}
      {titleContent === undefined || titleContent === null ? (
        <div
          data-testid="trailing-detail-panel-navigation"
          className="relative z-10 flex shrink-0 items-center gap-2.5 p-3"
        >
          {leading}
          <div className="flex min-w-0 flex-1 flex-col gap-px">
            <p
              className="m-0 truncate text-base font-semibold"
              style={{ color: colorVar('fore') }}
            >
              {title}
            </p>
            {subtitle ? (
              <p
                className="m-0 truncate text-xs"
                style={{ color: colorVar('foreSecondary') }}
              >
                {subtitle}
              </p>
            ) : null}
          </div>
          {trailingAccessory ? (
            <div className="shrink-0">{trailingAccessory}</div>
          ) : null}
        </div>
      ) : (
        <div
          data-testid="trailing-detail-panel-navigation"
          className="relative z-10 grid shrink-0 items-center p-3"
          style={{ gridTemplateColumns: '1fr auto 1fr' }}
        >
          <div className="justify-self-start">{leading}</div>
          <div className="min-w-0 justify-self-center">{titleContent}</div>
          <div className="justify-self-end">{trailingAccessory}</div>
        </div>
      )}
      <div
        key={navigationKey}
        data-kro-drill={direction ?? 'none'}
        style={drillAnimation(direction)}
        data-testid="trailing-detail-panel-body"
        // The one scroller: content taller than the panel scrolls here, and
        // nothing inside it clips — hosted bodies grow to their natural height.
        // The scrollbar itself is hidden — it still scrolls by wheel, trackpad,
        // touch and keyboard; only the bar is not drawn.
        className="relative z-10 min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {/*
          At least the panel's height, so a hosted body can centre itself
          vertically when it is shorter than the panel (`my-auto`), and still
          grows past it — and scrolls — when it is taller.
        */}
        <div
          data-testid="trailing-detail-panel-content"
          className="flex min-h-full flex-col"
        >
          {children}
        </div>
      </div>
    </GlassSurface>
  )
}

/** The diameter of a pane toolbar button — canon's glass circle, compact. */
export const PANEL_TOOLBAR_BUTTON_SIZE = 36

/**
 * The one glyph size and weight every pane toolbar item draws with — canon's
 * header buttons both set their symbol at 15pt semibold. Spread onto the icon.
 */
export const PANEL_TOOLBAR_GLYPH = { size: 15, strokeWidth: 2.25 } as const

/**
 * A pane header toolbar button: the close, and any trailing item a reading
 * adds (Session's "Show sessions"). One component so the two cannot drift —
 * canon draws both as the same `LiquidGlassCircleButton`.
 */
export function PanelToolbarButton({
  label,
  onPress,
  children,
  ...rest
}: {
  readonly label: string
  readonly onPress: () => void
  readonly children: ReactNode
} & Omit<ComponentPropsWithoutRef<'button'>, 'onClick' | 'children'>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onPress}
      data-kro-panel-toolbar-button=""
      className="kro-glass kro-glass--control kro-glass--interactive inline-flex shrink-0 items-center justify-center outline-none focus-visible:shadow-[var(--kro-ring)]"
      style={{
        width: PANEL_TOOLBAR_BUTTON_SIZE,
        height: PANEL_TOOLBAR_BUTTON_SIZE,
        borderRadius: '9999px',
        color: colorVar('fore'),
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
