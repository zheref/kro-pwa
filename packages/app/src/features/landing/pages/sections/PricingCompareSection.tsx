/**
 * The comparison — one table, rows are features, columns are Free and Plus.
 * A cell is a check, a dash or "Planned"; the check and the dash carry their
 * meaning for a screen reader too. Grouped by row headers (`scope="rowgroup"`)
 * so a reader hears which part of the product a row belongs to.
 *
 * On a phone the table keeps its three columns inside its own scroller; the
 * page itself never scrolls sideways.
 */
import { cn } from '../../../../design'
import {
  MarketingSection,
  Reveal,
  SectionHeader,
} from '../../../../design/marketing'
import {
  PRICING_CELL_TEXT,
  type PricingCell,
  pricingComparison,
  pricingCopy,
} from '../../LandingCopy'
import { PRICING_SECTION_IDS, headingIdFor } from '../../LandingSections'

function Cell({ value }: { readonly value: PricingCell }) {
  const text = PRICING_CELL_TEXT[value]
  return (
    <td
      data-cell={value}
      className={cn(
        'px-kro-medium py-kro-small text-center',
        value === 'included' && 'font-semibold text-kro-fore',
        value === 'excluded' && 'text-kro-fore-secondary',
        value === 'planned' && 'font-medium text-kro-fore-secondary text-sm',
      )}
    >
      {value === 'planned' ? (
        text.mark
      ) : (
        <>
          <span aria-hidden="true">{text.mark}</span>
          <span className="sr-only">{text.label}</span>
        </>
      )}
    </td>
  )
}

export function PricingCompareSection() {
  const titleId = headingIdFor(PRICING_SECTION_IDS.compare)
  return (
    <MarketingSection
      id={PRICING_SECTION_IDS.compare}
      tone="subtle"
      width="default"
      labelledBy={titleId}
    >
      <SectionHeader
        eyebrow={pricingCopy.compareEyebrow}
        title={pricingCopy.compareTitle}
        lede={pricingCopy.compareLede}
        headingId={titleId}
      />
      <Reveal>
        <div className="overflow-x-auto rounded-kro-surface border border-kro-hairline bg-kro-back">
          <table className="w-full min-w-[20rem] border-collapse text-left text-kro-fore">
            <caption className="sr-only">{pricingCopy.compareCaption}</caption>
            <thead>
              <tr className="border-kro-hairline border-b">
                <th scope="col" className="px-kro-medium py-kro-medium">
                  <span className="sr-only">Feature</span>
                </th>
                <th
                  scope="col"
                  className="w-24 px-kro-medium py-kro-medium text-center font-semibold md:w-40"
                >
                  Free
                </th>
                <th
                  scope="col"
                  className="w-24 px-kro-medium py-kro-medium text-center font-semibold md:w-40"
                >
                  Plus
                </th>
              </tr>
            </thead>
            {pricingComparison.map((group) => (
              <tbody key={group.title}>
                <tr>
                  <th
                    scope="rowgroup"
                    colSpan={3}
                    className="bg-kro-back-next px-kro-medium pt-kro-medium pb-kro-tiny font-semibold text-kro-fore-secondary text-sm uppercase tracking-wide"
                  >
                    {group.title}
                  </th>
                </tr>
                {group.rows.map((row) => (
                  <tr
                    key={row.feature}
                    className="border-kro-hairline border-t"
                  >
                    <th
                      scope="row"
                      className="px-kro-medium py-kro-small font-normal"
                    >
                      {row.feature}
                    </th>
                    <Cell value={row.free} />
                    <Cell value={row.plus} />
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
      </Reveal>
    </MarketingSection>
  )
}
