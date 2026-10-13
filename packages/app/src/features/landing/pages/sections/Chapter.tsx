/**
 * One chapter of the loop: copy on one side, product on the other, mirrored on
 * alternate rows from `md`. Revealed once on first scroll into view; under
 * reduced motion, or with no JS, it is simply there.
 */
import type { ReactNode } from 'react'
import { Reveal, SectionHeader } from '../../../../design/marketing'

export interface ChapterProps {
  readonly id: string
  readonly eyebrow: string
  readonly title: string
  readonly body: string
  readonly points: readonly string[]
  /** Put the media on the left from `md`. */
  readonly flip?: boolean
  readonly children: ReactNode
}

export function Chapter({
  id,
  eyebrow,
  title,
  body,
  points,
  flip = false,
  children,
}: ChapterProps) {
  return (
    <Reveal
      as="article"
      className="grid grid-cols-1 items-center gap-kro-xx-large py-kro-x-large md:grid-cols-2 md:gap-24"
    >
      <div className={flip ? 'md:order-2' : undefined}>
        <SectionHeader
          eyebrow={eyebrow}
          title={title}
          lede={body}
          level={3}
          headingId={`chapter-${id}-title`}
          className="mb-kro-large!"
        />
        <ul className="m-0 flex list-none flex-wrap gap-kro-small p-0">
          {points.map((point) => (
            <li
              key={point}
              className="rounded-full border border-kro-hairline px-kro-medium py-1 text-kro-fore-secondary text-sm"
            >
              {point}
            </li>
          ))}
        </ul>
      </div>
      <div className={flip ? 'md:order-1' : undefined}>{children}</div>
    </Reveal>
  )
}
