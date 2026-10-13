import type { ReactNode } from 'react'
import { Button } from '../system/primitives/button'
import { GlassSurface } from '../system/glass/GlassSurface'
import { cn } from '../system/utils/cn'

export interface CtaAction {
  readonly label: string
  readonly href: string
  readonly onClick?: () => void
}

export interface GlassCtaProps {
  readonly eyebrow?: string
  readonly title: string
  readonly lede?: string
  /** The one primary action. */
  readonly primary: CtaAction
  readonly secondary?: CtaAction
  /** Extra content under the buttons: a badge row, a footnote. */
  readonly children?: ReactNode
  readonly className?: string
}

/** A centred frosted call-to-action card floating over two glow blobs. */
export function GlassCta({
  eyebrow,
  title,
  lede,
  primary,
  secondary,
  children,
  className,
}: GlassCtaProps) {
  return (
    <div className={cn('kro-glass-cta', className)}>
      <span
        aria-hidden="true"
        className="kro-glow-blob"
        style={{ top: '-20%', left: '8%' }}
      />
      <span
        aria-hidden="true"
        className="kro-glow-blob kro-glow-blob--grape"
        style={{ bottom: '-24%', right: '6%' }}
      />
      <GlassSurface
        className="kro-glass-cta__card"
        style={{ borderRadius: 'var(--kro-glass-cta-radius)' }}
      >
        {eyebrow === undefined ? null : (
          <p className="kro-eyebrow">{eyebrow}</p>
        )}
        <h2 className="kro-display-2">{title}</h2>
        {lede === undefined ? null : <p className="kro-lede">{lede}</p>}
        <div className="kro-glass-cta__actions">
          <Button asChild variant="primary" size="lg" shape="circular">
            <a href={primary.href} onClick={primary.onClick}>
              {primary.label}
            </a>
          </Button>
          {secondary === undefined ? null : (
            <Button asChild variant="secondary" size="lg" shape="circular">
              <a href={secondary.href} onClick={secondary.onClick}>
                {secondary.label}
              </a>
            </Button>
          )}
        </div>
        {children}
      </GlassSurface>
    </div>
  )
}
