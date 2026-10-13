/**
 * The fixed glass navigation bar — brand, section links, "Open Kro" and the
 * theme toggle. A pure Fragment: the active link, the theme and every intent
 * arrive as props. The mobile menu is the primitive's own.
 */
import { MarketingNav, ThemeToggle } from '../../../../design/marketing'
import { LANDING_BRAND } from '../../LandingCopy'
import {
  LANDING_SECTION_IDS,
  type MarketingSurface,
  landingSectionHref,
  marketingNavLinks,
} from '../../LandingSections'
import type { LandingTheme } from '../../LandingFeature'

export interface LandingNavProps {
  readonly activeId: string | null
  readonly theme: LandingTheme
  readonly hubUrl: string
  readonly onToggleTheme: () => void
  readonly onOpenHub: () => void
  /** Called with the `href` of a followed link; the default action still runs. */
  readonly onNavigate: (href: string) => void
  /** The mobile menu button was pressed. */
  readonly onOpenMenu: () => void
  /**
   * The page the bar sits on. On the landing its links are in-page anchors;
   * anywhere else they lead back to the landing's sections (`/#the-loop`).
   */
  readonly surface?: MarketingSurface
}

export function LandingNav({
  activeId,
  theme,
  hubUrl,
  onToggleTheme,
  onOpenHub,
  onNavigate,
  onOpenMenu,
  surface = 'landing',
}: LandingNavProps) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: delegation only — the menu button inside is the keyboard-reachable control.
    // biome-ignore lint/a11y/useKeyWithClickEvents: a keyboard press on that button bubbles here as a click.
    <div
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('.kro-marketing-nav__menu'))
          onOpenMenu()
      }}
    >
      <MarketingNav
        brand={{
          label: LANDING_BRAND,
          href: landingSectionHref(LANDING_SECTION_IDS.top, surface),
          mark: (
            <img
              src="/landing/brand/kro-mark-192.png"
              width={28}
              height={28}
              alt=""
              decoding="async"
            />
          ),
        }}
        links={marketingNavLinks(surface)}
        cta={{ label: 'Open Kro', href: hubUrl, onClick: onOpenHub }}
        activeId={activeId}
        onNavigate={onNavigate}
        trailing={
          <ThemeToggle
            value={theme}
            onToggle={() => onToggleTheme()}
            label="Dark mode"
          />
        }
      />
    </div>
  )
}
