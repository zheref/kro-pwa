import { cn } from '../system/utils/cn'

export interface SectionHeaderProps {
  /** Small uppercase label above the title, with the gradient tick. */
  readonly eyebrow?: string
  readonly title: string
  /** The sentence under the title. */
  readonly lede?: string
  readonly align?: 'start' | 'center'
  /** Heading level: `2` for a section, `3` for a sub-section. */
  readonly level?: 2 | 3
  /** Id for the heading, so a section can point `aria-labelledby` at it. */
  readonly headingId?: string
  readonly className?: string
}

/** Eyebrow, headline and lede — the opening of a section. */
export function SectionHeader({
  eyebrow,
  title,
  lede,
  align = 'start',
  level = 2,
  headingId,
  className,
}: SectionHeaderProps) {
  const Heading = level === 2 ? 'h2' : 'h3'
  return (
    <header
      data-align={align}
      data-level={level}
      className={cn('kro-section-header', className)}
    >
      {eyebrow === undefined ? null : <p className="kro-eyebrow">{eyebrow}</p>}
      <Heading id={headingId} className="kro-display-2">
        {title}
      </Heading>
      {lede === undefined ? null : <p className="kro-lede">{lede}</p>}
    </header>
  )
}
