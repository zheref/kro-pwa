'use client'

/**
 * The Endeavor Detail read surface — the port of
 * `KroUI/EndeavorDetail/EndeavorDetailView.swift` (`RC-15`).
 *
 * Canon's structure, part for part: a hero header carrying the kind chip, the
 * title and the at-a-glance facts; one grouped card per non-relation section,
 * each row opening that field's editor; then one card per relation, each
 * stating its summary and offering *Manage* only where the kind allows it.
 *
 * ## `title` is drawn once, by the header
 *
 * Canon filters `.title` out of the Core section for exactly this reason: the
 * matrix marks it visible for every kind, and the header already renders it as
 * the heading — with its own pencil affordance, so the row it replaces is not a
 * lost entry point.
 *
 * ## The editor affordance is a trailing control, not the whole row
 *
 * Canon wraps each row in a `Button`. SwiftUI has no content model; HTML does,
 * and a `<button>` may hold only phrasing content — so wrapping the kit's
 * `PropertyRow` (a `div` of `span`s) in one produces invalid markup that no
 * assistive technology recovers from, and the same is true of the `h2` in the
 * header. Each row therefore carries a labelled trailing control — *"Edit
 * due"*, *"Edit title"* — which is the same affordance canon's chevron already
 * advertises, reachable by keyboard and announced by name.
 *
 * ## The tinted page, and the "no scrollbar" requirement
 *
 * Canon puts these cards on a grouped background and hides the scroll
 * indicators. The web equivalent is `scrollbar-width: none` plus the WebKit
 * pseudo-element, which is a pair `styles.css` has no utility for yet, so it is
 * written here with the reason beside it rather than added to a merged lane's
 * stylesheet.
 */
import type { Endeavor, EndeavorField, EndeavorRelation } from '@kro/core'
import {
  ChipFlow,
  KroChip,
  semanticTint,
} from '../../../design/endeavor/KroChip'
import { PropertyRow } from '../../../design/endeavor/PropertyRow'
import {
  CardRowStack,
  SectionCard,
  SurfaceCard,
} from '../../../design/endeavor/SurfaceCard'
import { endeavorIcon } from '../../../design/endeavor/endeavorIcons'
import { colorVar } from '../../../design/system/tokens/roles'
import type { EndeavorRelationCard } from '../EndeavorDetailCards'
import type { EndeavorDetailSectionModel } from '../EndeavorDetailEditing'
import {
  fieldIcon,
  fieldLabel,
  fieldValue,
  headerChips,
  kindChip,
  relationIcon,
  relationLabel,
  relationSummary,
} from './endeavorDetailDisplay'

const Pencil = endeavorIcon('pencil')
const ChevronRight = endeavorIcon('chevron.right')

/**
 * Canon hides the scroll indicators (`.scrollIndicators(.hidden)`); the web
 * needs both spellings, and neither has a Tailwind utility in this repo.
 */
export const HIDDEN_SCROLLBAR_STYLE = {
  scrollbarWidth: 'none',
  msOverflowStyle: 'none',
} as const

export interface EndeavorDetailFragmentProps {
  readonly endeavor: Endeavor
  /** Canon's `displayTitle` — "Untitled" for a blank one. */
  readonly title: string
  /** The sections worth a header, per-kind, from `#29`'s Selectors. */
  readonly sections: readonly EndeavorDetailSectionModel[]
  /** All four relations, each carrying its per-kind manageability. */
  readonly relations: readonly EndeavorRelationCard[]
  readonly locale?: string
  readonly onEditField: (field: EndeavorField) => void
  readonly onManageRelation: (relation: EndeavorRelation) => void
}

export function EndeavorDetailFragment({
  endeavor,
  title,
  sections,
  relations,
  locale,
  onEditField,
  onManageRelation,
}: EndeavorDetailFragmentProps) {
  const kind = kindChip(endeavor)
  const chips = headerChips(endeavor)

  return (
    <div
      data-testid="endeavor-detail"
      className="flex min-h-0 flex-1 flex-col gap-kro-large overflow-y-auto pb-kro-x-large [&>*]:shrink-0 [&::-webkit-scrollbar]:hidden"
      style={HIDDEN_SCROLLBAR_STYLE}
    >
      <SurfaceCard>
        <div data-testid="detail-header" className="flex flex-col gap-2.5">
          <div>
            <KroChip
              title={kind.title}
              icon={kind.icon}
              tint={kind.tint}
              emphasis="prominent"
            />
          </div>

          <div className="flex items-start gap-kro-small">
            <h2
              className="m-0 flex-1 font-bold text-xl"
              style={{ color: colorVar('fore') }}
            >
              {title}
            </h2>
            <IconAction label="Edit title" onPress={() => onEditField('title')}>
              <Pencil size={14} aria-hidden />
            </IconAction>
          </div>

          {chips.length === 0 ? null : (
            <ChipFlow>
              {chips.map((chip) => (
                <KroChip
                  key={chip.id}
                  title={chip.title}
                  icon={chip.icon}
                  tint={chip.tint}
                  size="small"
                />
              ))}
            </ChipFlow>
          )}
        </div>
      </SurfaceCard>

      {sections.map((section) => {
        // The header already drew the title; canon filters it out here.
        const rows = section.fields.filter((field) => field !== 'title')
        if (rows.length === 0) return null
        return (
          <SectionCard
            key={section.section}
            title={section.title}
            padding={null}
          >
            <CardRowStack>
              {rows.map((field) => (
                <div
                  key={field}
                  data-detail-field={field}
                  className="flex items-center gap-kro-small px-kro-medium py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <PropertyRow
                      label={fieldLabel(field)}
                      value={fieldValue(endeavor, field, locale)}
                      icon={fieldIcon(field)}
                    />
                  </div>
                  <IconAction
                    label={`Edit ${fieldLabel(field).toLowerCase()}`}
                    onPress={() => onEditField(field)}
                  >
                    <ChevronRight size={13} aria-hidden />
                  </IconAction>
                </div>
              ))}
            </CardRowStack>
          </SectionCard>
        )
      })}

      {relations.map((card) => (
        <SectionCard
          key={card.relation}
          title={relationLabel(card.relation)}
          icon={relationIcon(card.relation)}
          count={card.count === 0 ? undefined : card.count}
          actionTitle={card.isManageable ? 'Manage' : undefined}
          onAction={
            card.isManageable
              ? () => onManageRelation(card.relation)
              : undefined
          }
        >
          <div
            data-detail-relation={card.relation}
            className="flex items-start gap-kro-small"
          >
            <div className="min-w-0 flex-1">
              <PropertyRow
                label={relationLabel(card.relation)}
                value={relationSummary(endeavor, card.relation)}
              />
            </div>
            {card.isManageable ? null : (
              <span className="shrink-0">
                <KroChip
                  title="Read only"
                  icon="eye.circle.fill"
                  tint={semanticTint('chipNeutral')}
                  emphasis="outline"
                  size="small"
                />
              </span>
            )}
          </div>
        </SectionCard>
      ))}
    </div>
  )
}

/**
 * A named, keyboard-reachable icon control at the 44px floor.
 *
 * The glyph is 13–14px, which is canon's drawing; the floor belongs to the
 * BUTTON, exactly as `CompactPresentationHeader` does it — so the hit area
 * grows and the drawing does not.
 */
function IconAction({
  label,
  onPress,
  children,
}: {
  readonly label: string
  readonly onPress: () => void
  readonly children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onPress}
      className="inline-flex shrink-0 items-center justify-center rounded-kro-pill outline-none focus-visible:shadow-[var(--kro-ring)]"
      style={{
        minWidth: 'var(--kro-size-min-touch-target)',
        minHeight: 'var(--kro-size-min-touch-target)',
        color: colorVar('foreSecondary'),
      }}
    >
      {children}
    </button>
  )
}
