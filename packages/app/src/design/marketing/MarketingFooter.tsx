import type { ReactNode } from 'react'
import { cn } from '../system/utils/cn'

export interface FooterLink {
  readonly label: string
  readonly href: string
  /** Opens in a new tab with `rel="noopener noreferrer"`. */
  readonly external?: boolean
}

export interface FooterColumn {
  readonly title: string
  readonly links: readonly FooterLink[]
}

export interface MarketingFooterProps {
  readonly brand: {
    readonly label: string
    readonly mark?: ReactNode
    readonly tagline?: string
  }
  readonly columns: readonly FooterColumn[]
  /** The legal line: copyright, entity. */
  readonly legal: string
  /** Right-aligned extras under the grid, e.g. a theme toggle. */
  readonly trailing?: ReactNode
  readonly className?: string
}

/** Brand block on the left, link columns on the right, a legal line below. */
export function MarketingFooter({
  brand,
  columns,
  legal,
  trailing,
  className,
}: MarketingFooterProps) {
  return (
    <footer className={cn('kro-marketing-footer', className)}>
      <div className="kro-marketing-container">
        <div className="kro-marketing-footer__grid">
          <div>
            <div className="kro-marketing-nav__brand">
              {brand.mark}
              <span>{brand.label}</span>
            </div>
            {brand.tagline === undefined ? null : (
              <p className="kro-marketing-footer__tagline">{brand.tagline}</p>
            )}
          </div>
          <nav aria-label="Footer" className="kro-marketing-footer__columns">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="kro-marketing-footer__title">{column.title}</h2>
                <ul className="kro-marketing-footer__list">
                  {column.links.map((link) => (
                    <li key={link.href + link.label}>
                      <a
                        className="kro-marketing-footer__link"
                        href={link.href}
                        {...(link.external
                          ? { target: '_blank', rel: 'noopener noreferrer' }
                          : {})}
                      >
                        {link.label}
                        {link.external ? (
                          <span className="sr-only"> (opens in a new tab)</span>
                        ) : null}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <p className="kro-marketing-footer__legal">{legal}</p>
        {trailing}
      </div>
    </footer>
  )
}
