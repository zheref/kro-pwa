import { cn } from '../system/utils/cn'

export interface StatItem {
  /** The figure, already formatted: "4.9", "12k", "100%". */
  readonly value: string
  /** What the figure measures. */
  readonly label: string
}

export interface StatRowProps {
  readonly items: readonly StatItem[]
  readonly className?: string
}

/** A row of big gradient figures with quiet captions. */
export function StatRow({ items, className }: StatRowProps) {
  return (
    <dl className={cn('kro-stat-row', className)}>
      {items.map((item) => (
        <div key={item.label} className="kro-stat-row__item">
          <dd className="kro-stat-row__value kro-gradient-text">
            {item.value}
          </dd>
          <dt className="kro-stat-row__label">{item.label}</dt>
        </div>
      ))}
    </dl>
  )
}
