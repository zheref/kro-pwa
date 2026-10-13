'use client'

import { Menu } from 'lucide-react'
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react'
import { GlassSurface } from '../system/glass/GlassSurface'
import { ICON_SIZE } from '../system/icons/icons'
import { Button } from '../system/primitives/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from '../system/primitives/sheet'
import { cn } from '../system/utils/cn'

export interface NavLink {
  readonly label: string
  readonly href: string
  /** The section id this link points at; matched against `activeId`. */
  readonly id?: string
}

export interface MarketingNavProps {
  readonly brand: {
    readonly label: string
    readonly href: string
    readonly mark?: ReactNode
  }
  readonly links: readonly NavLink[]
  /** The call to action: a compact pill on the bar, the last item in the menu. */
  readonly cta: {
    readonly label: string
    readonly href: string
    readonly onClick?: () => void
  }
  /** Extra controls at the trailing edge, e.g. a `ThemeToggle`. */
  readonly trailing?: ReactNode
  /** The section currently in view (`useActiveSection`); its link is marked. */
  readonly activeId?: string | null
  /** Called with a link's `href` when it is followed. The default action still runs. */
  readonly onNavigate?: (href: string) => void
  /** Start with the mobile menu open — for stories and tests. */
  readonly defaultMenuOpen?: boolean
  readonly className?: string
}

/** Scroll distance past which the bar deepens its shadow. */
export const NAV_SCROLL_THRESHOLD = 8

/**
 * `aria-current` says what the link is current *as*: an in-page anchor is the
 * current location in the page, a route is the current page (WAI-ARIA).
 */
const currentToken = (href: string): 'page' | 'location' =>
  href.includes('#') ? 'location' : 'page'

/**
 * The fixed glass navigation bar.
 *
 * ≥768px: brand, link row, trailing slot, compact CTA. Below: brand, trailing
 * slot and a menu button that opens a top sheet (focus-trapped, Escape closes,
 * body scroll locked — Radix Dialog underneath) whose items stagger in.
 * Links are plain anchors: `packages/app` never imports `next/*`.
 */
export function MarketingNav({
  brand,
  links,
  cta,
  trailing,
  activeId = null,
  onNavigate,
  defaultMenuOpen = false,
  className,
}: MarketingNavProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(defaultMenuOpen)

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > NAV_SCROLL_THRESHOLD)
    update()
    window.addEventListener('scroll', update, { passive: true })
    return () => window.removeEventListener('scroll', update)
  }, [])

  const follow = (href: string, then?: () => void) => () => {
    then?.()
    onNavigate?.(href)
    setMenuOpen(false)
  }

  return (
    <GlassSurface
      as="header"
      material="bar"
      fixed
      scrolled={scrolled}
      className={cn('kro-marketing-nav', className)}
    >
      <div className="kro-marketing-container kro-marketing-container--wide kro-marketing-nav__inner">
        <a
          className="kro-marketing-nav__brand"
          href={brand.href}
          onClick={follow(brand.href)}
        >
          {brand.mark}
          <span>{brand.label}</span>
        </a>
        <nav aria-label="Primary" className="kro-marketing-nav__links-wrap">
          <ul className="kro-marketing-nav__links">
            {links.map((link) => {
              const active = link.id !== undefined && link.id === activeId
              return (
                <li key={link.href}>
                  <a
                    className={cn(
                      'kro-marketing-nav__link',
                      active && 'is-active',
                    )}
                    href={link.href}
                    aria-current={active ? currentToken(link.href) : undefined}
                    onClick={follow(link.href)}
                  >
                    {link.label}
                  </a>
                </li>
              )
            })}
          </ul>
        </nav>
        {trailing === undefined ? null : (
          <div className="kro-marketing-nav__trailing">{trailing}</div>
        )}
        <Button
          asChild
          variant="primary"
          size="pill"
          className="kro-marketing-nav__cta"
        >
          <a href={cta.href} onClick={follow(cta.href, cta.onClick)}>
            {cta.label}
          </a>
        </Button>
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="kro-marketing-nav__menu"
              aria-label="Open menu"
            >
              <Menu aria-hidden="true" size={ICON_SIZE.medium} />
            </button>
          </SheetTrigger>
          <SheetContent side="top">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Site navigation
            </SheetDescription>
            <ul className="kro-marketing-menu">
              {[
                ...links.map((link) => ({ ...link, extra: undefined })),
                { label: cta.label, href: cta.href, extra: cta.onClick },
              ].map((item, index) => {
                const current =
                  'id' in item && item.id !== undefined && item.id === activeId
                return (
                  <li
                    key={item.href + item.label}
                    className="kro-marketing-menu__item"
                    style={{ '--i': index } as CSSProperties}
                  >
                    <a
                      className={cn(
                        'kro-marketing-menu__link',
                        current && 'is-active',
                      )}
                      href={item.href}
                      aria-current={
                        current ? currentToken(item.href) : undefined
                      }
                      onClick={follow(item.href, item.extra)}
                    >
                      {item.label}
                    </a>
                  </li>
                )
              })}
            </ul>
          </SheetContent>
        </Sheet>
      </div>
    </GlassSurface>
  )
}
