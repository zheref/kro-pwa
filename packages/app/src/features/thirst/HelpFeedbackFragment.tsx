/**
 * `HelpFeedbackFragment` — canon `KroUI/Settings/HelpFeedbackView.swift`.
 * Domain-less otherwise (`RC-14`); kept in the Thirst feature's lane rather
 * than `design/` only because that tier is outside `#35`'s declared file
 * lane — see the header note in `ThirstDestinationPage.tsx` for the same
 * shape of divergence.
 *
 * Six rows across three sections — Resources (Documentation, Community
 * Forum), Support (Contact Support, Rate on App Store), Feedback (Report a
 * Problem, Suggest a Feature) — every one genuinely **inert**: canon's
 * `docs/Features/Thirst.md` lists this menu explicitly as *not* a Thirst
 * surface ("Support affordances, not features to vote on") and its own view
 * wires every row to an empty `{}` action. This port does the same — no
 * `onClick`, no `href`, no invented destination — rather than "fixing" a row
 * canon deliberately leaves unwired.
 */
import type { LucideIcon } from 'lucide-react'
import {
  BookOpen,
  Flag,
  Lightbulb,
  Mail,
  MessagesSquare,
  Star,
} from 'lucide-react'
import { colorVar } from '../../design/system/tokens/roles'
import { cn } from '../../design/system/utils/cn'

interface HelpFeedbackRow {
  readonly icon: LucideIcon
  readonly label: string
}

interface HelpFeedbackSection {
  readonly title: string
  readonly rows: readonly HelpFeedbackRow[]
}

/** Canon's three `Section`s, verbatim — six rows, in canon's own order. */
const HELP_FEEDBACK_SECTIONS: readonly HelpFeedbackSection[] = [
  {
    title: 'Resources',
    rows: [
      { icon: BookOpen, label: 'Documentation' },
      { icon: MessagesSquare, label: 'Community Forum' },
    ],
  },
  {
    title: 'Support',
    rows: [
      { icon: Mail, label: 'Contact Support' },
      { icon: Star, label: 'Rate on App Store' },
    ],
  },
  {
    title: 'Feedback',
    rows: [
      { icon: Flag, label: 'Report a Problem' },
      { icon: Lightbulb, label: 'Suggest a Feature' },
    ],
  },
]

export interface HelpFeedbackFragmentProps {
  readonly className?: string
}

export function HelpFeedbackFragment({ className }: HelpFeedbackFragmentProps) {
  return (
    <nav
      aria-label="Help & Feedback"
      data-testid="help-feedback-surface"
      className={cn('flex w-full flex-col gap-kro-large', className)}
    >
      {HELP_FEEDBACK_SECTIONS.map((section) => (
        <div key={section.title} className="flex flex-col gap-kro-small">
          <h3
            className="px-kro-small font-semibold text-xs uppercase tracking-wide"
            style={{ color: colorVar('foreSecondary') }}
          >
            {section.title}
          </h3>
          <div
            className="flex flex-col overflow-hidden rounded-kro-card"
            style={{ boxShadow: `inset 0 0 0 1px ${colorVar('hairline')}` }}
          >
            {section.rows.map((row, index) => (
              <HelpFeedbackRowView
                key={row.label}
                row={row}
                isLast={index === section.rows.length - 1}
              />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

function HelpFeedbackRowView({
  row,
  isLast,
}: {
  readonly row: HelpFeedbackRow
  readonly isLast: boolean
}) {
  const Icon = row.icon
  return (
    <button
      type="button"
      // Genuinely inert — canon's own `{}` action. No destination is invented.
      className={cn(
        'flex min-h-11 items-center gap-kro-small px-kro-medium py-kro-small',
        'bg-kro-back text-left text-kro-fore text-sm',
      )}
      style={
        isLast
          ? undefined
          : { boxShadow: `inset 0 -1px 0 ${colorVar('hairline')}` }
      }
    >
      <Icon
        size={16}
        aria-hidden="true"
        style={{ color: colorVar('foreSecondary') }}
      />
      <span>{row.label}</span>
    </button>
  )
}
