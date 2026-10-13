/**
 * Six plain questions. The open entry is controlled by the slice (one at a
 * time), so the page remembers it and an analytics event fires per opening.
 */
import { Accordion } from '../../../../design'
import {
  MarketingSection,
  Reveal,
  SectionHeader,
} from '../../../../design/marketing'
import { faqCopy, faqEntries } from '../../LandingCopy'
import { LANDING_SECTION_IDS, headingIdFor } from '../../LandingSections'

export interface FaqSectionProps {
  readonly openId: string | null
  readonly onOpen: (id: string) => void
  readonly onClose: () => void
}

const ITEMS = faqEntries.map((entry) => ({
  id: entry.id,
  title: entry.question,
  content: <p className="m-0 text-kro-fore-secondary">{entry.answer}</p>,
}))

export function FaqSection({ openId, onOpen, onClose }: FaqSectionProps) {
  const titleId = headingIdFor(LANDING_SECTION_IDS.faq)
  return (
    <MarketingSection
      id={LANDING_SECTION_IDS.faq}
      tone="subtle"
      width="narrow"
      labelledBy={titleId}
    >
      <SectionHeader
        eyebrow={faqCopy.eyebrow}
        title={faqCopy.title}
        headingId={titleId}
      />
      <Reveal>
        <Accordion
          items={ITEMS}
          size="large"
          className="[&_button]:min-h-11"
          openIds={openId === null ? [] : [openId]}
          onOpenChange={(ids) => {
            const next = ids.at(-1)
            if (next === undefined) onClose()
            else onOpen(next)
          }}
        />
      </Reveal>
    </MarketingSection>
  )
}
