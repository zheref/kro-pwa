/**
 * "Kro is a federation, not an island" — what Kro connects to today, and what
 * is next. Text only: no third-party logos, so no brand is implied to endorse
 * it. "Coming next" cards say so in their own words, not only in colour.
 */
import {
  type LucideIcon,
  CalendarDays,
  CalendarRange,
  CheckCheck,
  Cloud,
  GitBranch,
  Kanban,
  ListChecks,
  ListTodo,
} from 'lucide-react'
import {
  FeatureCard,
  MarketingSection,
  Reveal,
  SectionHeader,
} from '../../../../design/marketing'
import { federationCards, federationCopy } from '../../LandingCopy'
import { LANDING_SECTION_IDS, headingIdFor } from '../../LandingSections'

const ICONS: Record<string, LucideIcon> = {
  'kro-cloud': Cloud,
  'apple-calendar': CalendarDays,
  'apple-reminders': ListChecks,
  'google-calendar': CalendarRange,
  'google-tasks': ListTodo,
  'microsoft-todo': CheckCheck,
  github: GitBranch,
  jira: Kanban,
}

export function FederationSection() {
  const titleId = headingIdFor(LANDING_SECTION_IDS.federation)
  return (
    <MarketingSection
      id={LANDING_SECTION_IDS.federation}
      tone="subtle"
      width="wide"
      labelledBy={titleId}
    >
      <SectionHeader
        eyebrow={federationCopy.eyebrow}
        title={federationCopy.title}
        lede={federationCopy.lede}
        headingId={titleId}
      />
      <Reveal className="grid grid-cols-1 gap-kro-large sm:grid-cols-2 lg:grid-cols-4">
        {federationCards.map((card) => (
          <FeatureCard
            key={card.id}
            icon={ICONS[card.id] ?? Cloud}
            title={card.title}
            body={card.body}
            accentRole={card.status === 'available' ? 'accent' : 'payneGray'}
          />
        ))}
      </Reveal>
    </MarketingSection>
  )
}
