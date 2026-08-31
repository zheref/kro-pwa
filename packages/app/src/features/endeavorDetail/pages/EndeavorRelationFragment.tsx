'use client'

/**
 * The four relation screens, on one shared layout — the port of
 * `EndeavorPerformancesView`, `EndeavorDefersView`, `EndeavorHostsView` and
 * `EndeavorShadowsView` (`RC-15`).
 *
 * Canon ships four files with the **same** four parts in the same order: a
 * titled intro, an error banner, a grouped list (or its empty state), and
 * either an add form or an info banner saying why there is none. Four copies of
 * one layout is exactly the duplication `RC-32` names, so the layout is written
 * once here and the four screens differ only in the list row and the form —
 * which is genuinely all they differ in.
 *
 * ## The read-only copy is `#29`'s, never invented here
 *
 * `relationReadOnlyReason` and `relationEmptyState` are the merged logic tier's
 * strings, keyed by relation **and** by editability, and its own header states
 * why: *"'log one below by hand' is a lie on a surface that has no form."* This
 * Fragment prints what it is handed and mints no message of its own.
 *
 * ## Hosts cannot be attached in this build, and the screen says so per row
 *
 * `hostAttachCandidatesOf` reports `isAttachable: false` with a reason for
 * every provider (`#29`, and `attachHostThunk` refuses with the same string).
 * The Attach control is therefore rendered **disabled with its reason beside
 * it** rather than hidden: a hidden control makes the gap invisible, and canon
 * never disables an affordance silently.
 *
 * ## No `ScreenIntroHeader`
 *
 * Canon's intro is `KroUI/Components/ScreenIntroHeader.swift`, which the merged
 * component kit did not port (it is not in `#14`'s declared surface). The intro
 * below is that shape — glyph, title, subtitle, optional summary chips — built
 * from the kit's own primitives. Porting the component properly belongs to
 * whichever child next opens `design/endeavor/`.
 */
import {
  type Defer,
  type Endeavor,
  type EndeavorHost,
  EndeavorKind,
  EndeavorRelation,
  type Perform,
  PerformResolution,
  type Shadow,
  assertNever,
  endeavorHostDisplayName,
  endeavorKindDisplayName,
  endeavorKinds,
  makeDefer,
  makePerform,
  makeShadow,
  performResolutions,
} from '@kro/core'
import { EmptyStateCard } from '../../../design/endeavor/EmptyStateCard'
import { InlineBanner } from '../../../design/endeavor/InlineBanner'
import { ChipFlow, KroChip } from '../../../design/endeavor/KroChip'
import { CardRowStack, SectionCard } from '../../../design/endeavor/SurfaceCard'
import { endeavorIcon } from '../../../design/endeavor/endeavorIcons'
import {
  localInputValue,
  parseLocalInput,
} from '../../../design/endeavor/endeavorPopovers'
import { Input } from '../../../design/system/primitives/input'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import type { EndeavorDetailException } from '../EndeavorDetailException'
import type {
  HostAttachCandidate,
  RelationDraft,
  RelationEmptyState,
} from '../EndeavorRelations'
import { HIDDEN_SCROLLBAR_STYLE } from './EndeavorDetailFragment'
import {
  deferTitle,
  detailDateTime,
  hostChip,
  performanceChips,
  performanceSummaryChips,
  relationIcon,
  relationLabel,
  relationSubtitle,
  shadowChips,
  shadowTitle,
} from './endeavorDetailDisplay'

const Trash = endeavorIcon('trash')
// Canon detaches with `minus`; neither symbol map carries it, so the
// nearest mapped neighbour stands in and says so here.
const Detach = endeavorIcon('xmark')

export interface EndeavorRelationFragmentProps {
  readonly relation: EndeavorRelation
  readonly endeavor: Endeavor
  /** `null` when the relation is editable for this kind; the reason otherwise. */
  readonly readOnlyReason: string | null
  readonly emptyState: RelationEmptyState
  readonly isSaving: boolean
  readonly exception: EndeavorDetailException | null
  readonly draft: RelationDraft | null
  readonly isDraftCommittable: boolean
  readonly attachedHosts: readonly EndeavorHost[]
  readonly hostCandidates: readonly HostAttachCandidate[]
  /** The instant an unopened draft seeds itself from (`RC-5`: never a clock). */
  readonly now: Date
  readonly locale?: string
  readonly onChangeDraft: (draft: RelationDraft | null) => void
  readonly onCommitDraft: () => void
  readonly onRemoveEntry: (index: number) => void
  readonly onAttachHost: (host: EndeavorHost) => void
  readonly onDetachHost: (host: EndeavorHost) => void
}

export function EndeavorRelationFragment(props: EndeavorRelationFragmentProps) {
  const {
    relation,
    endeavor,
    readOnlyReason,
    emptyState,
    isSaving,
    exception,
    locale,
  } = props
  const isEditable = readOnlyReason === null
  const Glyph = endeavorIcon(relationIcon(relation))

  return (
    <div
      data-testid="endeavor-relation"
      data-relation={relation}
      className="flex min-h-0 flex-1 flex-col gap-kro-large overflow-y-auto pb-kro-x-large [&>*]:shrink-0 [&::-webkit-scrollbar]:hidden"
      style={HIDDEN_SCROLLBAR_STYLE}
    >
      <header className="flex flex-col gap-kro-small">
        <div className="flex items-center gap-kro-small">
          <Glyph size={22} aria-hidden style={{ color: colorVar('accent') }} />
          <h2
            className="m-0 font-bold text-xl"
            style={{ color: colorVar('fore') }}
          >
            {relationLabel(relation)}
          </h2>
        </div>
        <p className="m-0 text-sm" style={{ color: colorVar('foreSecondary') }}>
          {relationSubtitle(relation)}
        </p>
        {relation === EndeavorRelation.performances &&
        endeavor.performances.length > 0 ? (
          <ChipFlow>
            {performanceSummaryChips(endeavor.performances).map((chip) => (
              <KroChip
                key={chip.id}
                title={chip.title}
                icon={chip.icon}
                tint={chip.tint}
                size="small"
              />
            ))}
          </ChipFlow>
        ) : null}
      </header>

      {exception === null ? null : <InlineBanner message={exception.message} />}

      <RelationList
        {...props}
        isEditable={isEditable}
        emptyState={emptyState}
        locale={locale}
      />

      {isEditable ? (
        <RelationForm {...props} />
      ) : (
        <InlineBanner kind="info" message={readOnlyReason} />
      )}

      {isSaving ? (
        <p
          role="status"
          className="m-0 text-sm"
          style={{ color: colorVar('foreSecondary') }}
        >
          Saving…
        </p>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* The list                                                                  */
/* ------------------------------------------------------------------------ */

function RelationList(
  props: EndeavorRelationFragmentProps & {
    readonly isEditable: boolean
  },
) {
  const {
    relation,
    endeavor,
    isEditable,
    emptyState,
    isSaving,
    attachedHosts,
    locale,
    onRemoveEntry,
    onDetachHost,
  } = props

  switch (relation) {
    case EndeavorRelation.performances:
      return (
        <SectionCard
          title="Recorded"
          icon="checkmark.circle"
          count={endeavor.performances.length || undefined}
          padding={endeavor.performances.length === 0 ? undefined : null}
        >
          {endeavor.performances.length === 0 ? (
            <EmptyStateCard
              icon="questionmark.circle"
              title={emptyState.title}
              message={emptyState.message}
            />
          ) : (
            <CardRowStack>
              {endeavor.performances.map((entry, index) => (
                <PerformanceRow
                  key={`${entry.date.getTime()}-${index}`}
                  entry={entry}
                  index={index}
                  isEditable={isEditable}
                  isSaving={isSaving}
                  locale={locale}
                  onRemove={onRemoveEntry}
                />
              ))}
            </CardRowStack>
          )}
        </SectionCard>
      )

    case EndeavorRelation.defers:
      return (
        <SectionCard
          title="History"
          icon="clock.arrow.circlepath"
          count={endeavor.defers.length || undefined}
          padding={endeavor.defers.length === 0 ? undefined : null}
        >
          {endeavor.defers.length === 0 ? (
            <EmptyStateCard
              icon="checkmark.circle"
              title={emptyState.title}
              message={emptyState.message}
            />
          ) : (
            <CardRowStack>
              {endeavor.defers.map((entry, index) => (
                <DeferRow
                  key={`${entry.made.getTime()}-${index}`}
                  entry={entry}
                  index={index}
                  isEditable={isEditable}
                  isSaving={isSaving}
                  locale={locale}
                  onRemove={onRemoveEntry}
                />
              ))}
            </CardRowStack>
          )}
        </SectionCard>
      )

    case EndeavorRelation.hosts:
      return (
        <SectionCard
          title="Attached"
          icon="network"
          count={attachedHosts.length || undefined}
          padding={attachedHosts.length === 0 ? undefined : null}
        >
          {attachedHosts.length === 0 ? (
            <EmptyStateCard
              icon="network"
              title={emptyState.title}
              message={emptyState.message}
            />
          ) : (
            <CardRowStack>
              {attachedHosts.map((host) => (
                <div
                  key={host}
                  data-attached-host={host}
                  className="flex items-center gap-kro-small px-kro-medium py-2.5"
                >
                  <KroChip {...chipProps(host)} size="small" />
                  <span className="flex-1" />
                  {isEditable ? (
                    <IconButton
                      label={`Detach ${endeavorHostDisplayName(host)}`}
                      isDestructive
                      disabled={isSaving}
                      onPress={() => onDetachHost(host)}
                    >
                      <Detach size={14} aria-hidden />
                    </IconButton>
                  ) : null}
                </div>
              ))}
            </CardRowStack>
          )}
        </SectionCard>
      )

    case EndeavorRelation.shadows: {
      const shadows = endeavor.shadows ?? []
      return (
        <SectionCard
          title="Current"
          icon="square.and.arrow.down"
          count={shadows.length || undefined}
          padding={shadows.length === 0 ? undefined : null}
        >
          {shadows.length === 0 ? (
            <EmptyStateCard
              icon="square.and.arrow.down"
              title={emptyState.title}
              message={emptyState.message}
            />
          ) : (
            <CardRowStack>
              {shadows.map((shadow, index) => (
                <ShadowRow
                  key={`${shadow.sourceIdentifier}-${index}`}
                  shadow={shadow}
                  index={index}
                  isEditable={isEditable}
                  isSaving={isSaving}
                  onRemove={onRemoveEntry}
                />
              ))}
            </CardRowStack>
          )}
        </SectionCard>
      )
    }

    default:
      return assertNever(relation)
  }
}

const chipProps = (host: EndeavorHost) => {
  const chip = hostChip(host)
  return { title: chip.title, icon: chip.icon, tint: chip.tint }
}

function PerformanceRow({
  entry,
  index,
  isEditable,
  isSaving,
  locale,
  onRemove,
}: {
  readonly entry: Perform
  readonly index: number
  readonly isEditable: boolean
  readonly isSaving: boolean
  readonly locale?: string
  readonly onRemove: (index: number) => void
}) {
  const when = detailDateTime(entry.date, locale)
  return (
    <div className="flex items-start gap-kro-small px-kro-medium py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="m-0 font-semibold text-sm" style={{ color: colorVar('fore') }}>
          {when}
        </p>
        <ChipFlow>
          {performanceChips(entry).map((chip) => (
            <KroChip
              key={chip.id}
              title={chip.title}
              icon={chip.icon}
              tint={chip.tint}
              size="small"
            />
          ))}
        </ChipFlow>
        {entry.notes === null || entry.notes.length === 0 ? null : (
          <p className="m-0 text-xs" style={{ color: colorVar('foreSecondary') }}>
            {entry.notes}
          </p>
        )}
      </div>
      {isEditable ? (
        <IconButton
          label={`Remove performance on ${when}`}
          isDestructive
          disabled={isSaving}
          onPress={() => onRemove(index)}
        >
          <Trash size={14} aria-hidden />
        </IconButton>
      ) : null}
    </div>
  )
}

function DeferRow({
  entry,
  index,
  isEditable,
  isSaving,
  locale,
  onRemove,
}: {
  readonly entry: Defer
  readonly index: number
  readonly isEditable: boolean
  readonly isSaving: boolean
  readonly locale?: string
  readonly onRemove: (index: number) => void
}) {
  const target = deferTitle(entry, locale)
  return (
    <div className="flex items-start gap-kro-small px-kro-medium py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="m-0 font-semibold text-sm" style={{ color: colorVar('fore') }}>
          {target}
        </p>
        <p className="m-0 text-xs" style={{ color: colorVar('foreSecondary') }}>
          {`Deferred ${detailDateTime(entry.made, locale)}`}
        </p>
        {entry.reason === null || entry.reason.length === 0 ? null : (
          <p className="m-0 text-xs" style={{ color: colorVar('foreSecondary') }}>
            {entry.reason}
          </p>
        )}
      </div>
      {isEditable ? (
        <IconButton
          label={`Remove defer to ${target}`}
          isDestructive
          disabled={isSaving}
          onPress={() => onRemove(index)}
        >
          <Trash size={14} aria-hidden />
        </IconButton>
      ) : null}
    </div>
  )
}

function ShadowRow({
  shadow,
  index,
  isEditable,
  isSaving,
  onRemove,
}: {
  readonly shadow: Shadow
  readonly index: number
  readonly isEditable: boolean
  readonly isSaving: boolean
  readonly onRemove: (index: number) => void
}) {
  const title = shadowTitle(shadow)
  return (
    <div className="flex items-start gap-kro-small px-kro-medium py-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="m-0 font-semibold text-sm" style={{ color: colorVar('fore') }}>
          {title}
        </p>
        <ChipFlow>
          {shadowChips(shadow).map((chip) => (
            <KroChip
              key={chip.id}
              title={chip.title}
              icon={chip.icon}
              tint={chip.tint}
              size="small"
            />
          ))}
        </ChipFlow>
      </div>
      {isEditable ? (
        <IconButton
          label={`Remove ${title}`}
          isDestructive
          disabled={isSaving}
          onPress={() => onRemove(index)}
        >
          <Trash size={14} aria-hidden />
        </IconButton>
      ) : null}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* The add form                                                              */
/* ------------------------------------------------------------------------ */

function RelationForm(props: EndeavorRelationFragmentProps) {
  const {
    relation,
    draft,
    isDraftCommittable,
    isSaving,
    hostCandidates,
    now,
    onChangeDraft,
    onCommitDraft,
    onAttachHost,
  } = props

  if (relation === EndeavorRelation.hosts) {
    return (
      <SectionCard title="Available" icon="plus.circle.fill">
        {hostCandidates.length === 0 ? (
          <EmptyStateCard
            icon="checkmark.circle"
            title="All set"
            message="Every provider is already attached."
          />
        ) : (
          <div className="flex flex-col gap-kro-small">
            {hostCandidates.map((candidate) => (
              <div
                key={candidate.host}
                data-host-candidate={candidate.host}
                className="flex flex-col gap-kro-tiny"
              >
                <div className="flex items-center gap-kro-small">
                  <KroChip {...chipProps(candidate.host)} size="small" />
                  <span className="flex-1" />
                  <button
                    type="button"
                    disabled={isSaving || !candidate.isAttachable}
                    onClick={() => onAttachHost(candidate.host)}
                    className="rounded-kro-small px-kro-small text-sm font-semibold outline-none focus-visible:shadow-[var(--kro-ring)] disabled:opacity-[var(--kro-opacity-disabled)]"
                    style={{
                      color: colorVar('accent'),
                      minHeight: 'var(--kro-size-min-touch-target)',
                    }}
                  >
                    {`Attach ${candidate.label}`}
                  </button>
                </div>
                {candidate.unavailableReason === null ? null : (
                  <p
                    className="m-0 text-xs"
                    style={{ color: colorVar('foreSecondary') }}
                  >
                    {candidate.unavailableReason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    )
  }

  const title =
    relation === EndeavorRelation.performances
      ? 'Add Performance'
      : relation === EndeavorRelation.defers
        ? 'Add Defer'
        : 'Add Shadow'

  return (
    <SectionCard title={title} icon="plus">
      <form
        className="flex flex-col gap-kro-medium"
        onSubmit={(event) => {
          event.preventDefault()
          if (isDraftCommittable && !isSaving) onCommitDraft()
        }}
      >
        {relation === EndeavorRelation.performances ? (
          <PerformanceForm
            draft={draft}
            now={now}
            isSaving={isSaving}
            onChangeDraft={onChangeDraft}
          />
        ) : relation === EndeavorRelation.defers ? (
          <DeferForm
            draft={draft}
            now={now}
            isSaving={isSaving}
            onChangeDraft={onChangeDraft}
          />
        ) : (
          <ShadowForm draft={draft} isSaving={isSaving} onChangeDraft={onChangeDraft} />
        )}

        <button
          type="submit"
          disabled={!isDraftCommittable || isSaving}
          className={cn(
            'inline-flex items-center justify-center rounded-kro-pill px-4',
            'text-sm font-semibold outline-none focus-visible:shadow-[var(--kro-ring)]',
            'disabled:opacity-[var(--kro-opacity-disabled)]',
          )}
          style={{
            minHeight: 'var(--kro-size-min-touch-target)',
            backgroundColor: colorVar('accent'),
            color: colorVar('onAccent'),
          }}
        >
          {title}
        </button>
      </form>
    </SectionCard>
  )
}

/** The draft each form starts from when nothing is open yet. */
const emptyPerformanceDraft = (now: Date) => ({
  relation: 'performances' as const,
  draft: {
    date: now,
    durationSeconds: 25 * 60,
    resolution: PerformResolution.complete,
    notes: '',
    rewardPoints: 0,
    wasCompletedInSession: false,
    editingIndex: null,
  },
})

function PerformanceForm({
  draft,
  now,
  isSaving,
  onChangeDraft,
}: {
  readonly draft: RelationDraft | null
  readonly now: Date
  readonly isSaving: boolean
  readonly onChangeDraft: (draft: RelationDraft | null) => void
}) {
  const current =
    draft !== null && draft.relation === 'performances'
      ? draft
      : emptyPerformanceDraft(now)
  const value = current.draft

  const patch = (next: Partial<typeof value>) =>
    onChangeDraft({ relation: 'performances', draft: { ...value, ...next } })

  return (
    <>
      <Field label="Date" htmlFor="performance-date">
        <Input
          id="performance-date"
          type="datetime-local"
          disabled={isSaving}
          value={localInputValue(value.date)}
          onChange={(event) => {
            const parsed = parseLocalInput(event.target.value)
            if (parsed !== null) patch({ date: parsed })
          }}
        />
      </Field>
      <Field label="Duration (minutes)" htmlFor="performance-duration">
        <Input
          id="performance-duration"
          type="number"
          min={0}
          step={5}
          disabled={isSaving}
          value={String(Math.round(value.durationSeconds / 60))}
          onChange={(event) =>
            patch({ durationSeconds: Number(event.target.value) * 60 })
          }
        />
      </Field>
      <Field label="Resolution" htmlFor="performance-resolution">
        <NativeSelect
          id="performance-resolution"
          value={value.resolution}
          disabled={isSaving}
          onChange={(next) =>
            patch({ resolution: next as PerformResolution })
          }
          options={performResolutions.map((resolution) => ({
            value: resolution,
            label: resolution,
          }))}
        />
      </Field>
      <Field label="Notes (optional)" htmlFor="performance-notes">
        <textarea
          id="performance-notes"
          rows={3}
          disabled={isSaving}
          value={value.notes}
          onChange={(event) => patch({ notes: event.target.value })}
          className="w-full rounded-kro-field p-kro-small text-sm outline-none focus-visible:shadow-[var(--kro-ring)]"
          style={{
            backgroundColor: colorVar('backInner'),
            color: colorVar('fore'),
          }}
        />
      </Field>
      <Field label="Reward points" htmlFor="performance-points">
        <Input
          id="performance-points"
          type="number"
          min={0}
          step={5}
          disabled={isSaving}
          value={String(value.rewardPoints)}
          onChange={(event) => patch({ rewardPoints: Number(event.target.value) })}
        />
      </Field>
      <label
        className="flex items-center gap-kro-small text-sm"
        style={{ color: colorVar('fore') }}
      >
        <input
          type="checkbox"
          disabled={isSaving}
          checked={value.wasCompletedInSession}
          onChange={(event) =>
            patch({ wasCompletedInSession: event.target.checked })
          }
          className="size-5 accent-[var(--kro-color-accent)]"
        />
        This was a whole focus session
      </label>
    </>
  )
}

function DeferForm({
  draft,
  now,
  isSaving,
  onChangeDraft,
}: {
  readonly draft: RelationDraft | null
  readonly now: Date
  readonly isSaving: boolean
  readonly onChangeDraft: (draft: RelationDraft | null) => void
}) {
  const value =
    draft !== null && draft.relation === 'defers'
      ? draft.draft
      : { target: now, reason: '' }

  const patch = (next: Partial<typeof value>) =>
    onChangeDraft({ relation: 'defers', draft: { ...value, ...next } })

  return (
    <>
      <Field label="Defer to" htmlFor="defer-target">
        <Input
          id="defer-target"
          type="datetime-local"
          disabled={isSaving}
          value={localInputValue(value.target)}
          onChange={(event) => {
            const parsed = parseLocalInput(event.target.value)
            if (parsed !== null) patch({ target: parsed })
          }}
        />
      </Field>
      <Field label="Reason (optional)" htmlFor="defer-reason">
        <Input
          id="defer-reason"
          disabled={isSaving}
          value={value.reason}
          onChange={(event) => patch({ reason: event.target.value })}
        />
      </Field>
    </>
  )
}

function ShadowForm({
  draft,
  isSaving,
  onChangeDraft,
}: {
  readonly draft: RelationDraft | null
  readonly isSaving: boolean
  readonly onChangeDraft: (draft: RelationDraft | null) => void
}) {
  const value =
    draft !== null && draft.relation === 'shadows'
      ? draft.draft
      : {
          originalTitle: '',
          sourceIdentifier: '',
          source: '',
          kind: EndeavorKind.task,
          group: '',
        }

  const patch = (next: Partial<typeof value>) =>
    onChangeDraft({ relation: 'shadows', draft: { ...value, ...next } })

  return (
    <>
      <Field label="Original title" htmlFor="shadow-title">
        <Input
          id="shadow-title"
          disabled={isSaving}
          value={value.originalTitle}
          onChange={(event) => patch({ originalTitle: event.target.value })}
        />
      </Field>
      <Field label="Source identifier" htmlFor="shadow-identifier">
        <Input
          id="shadow-identifier"
          disabled={isSaving}
          value={value.sourceIdentifier}
          onChange={(event) => patch({ sourceIdentifier: event.target.value })}
        />
      </Field>
      <Field label="Source" htmlFor="shadow-source">
        <Input
          id="shadow-source"
          disabled={isSaving}
          value={value.source}
          onChange={(event) => patch({ source: event.target.value })}
        />
      </Field>
      <Field label="Kind" htmlFor="shadow-kind">
        <NativeSelect
          id="shadow-kind"
          value={value.kind}
          disabled={isSaving}
          onChange={(next) => patch({ kind: next as EndeavorKind })}
          options={endeavorKinds.map((kind) => ({
            value: kind,
            label: endeavorKindDisplayName(kind),
          }))}
        />
      </Field>
      <Field label="Group (optional)" htmlFor="shadow-group">
        <Input
          id="shadow-group"
          disabled={isSaving}
          value={value.group}
          onChange={(event) => patch({ group: event.target.value })}
        />
      </Field>
    </>
  )
}

/* ------------------------------------------------------------------------ */
/* Draft → domain                                                            */
/* ------------------------------------------------------------------------ */

/**
 * The domain value a committed draft becomes.
 *
 * Exported and pure, so the Page's commit path is one call and the mapping is
 * unit-tested rather than asserted through a rendered form. `null` for `hosts`,
 * which commits by attaching rather than by adding a row.
 */
export const relationEntryFromDraft = (
  draft: RelationDraft,
  now: Date,
): Perform | Defer | Shadow | null => {
  switch (draft.relation) {
    case 'performances': {
      const notes = draft.draft.notes.trim()
      return makePerform({
        date: draft.draft.date,
        duration: draft.draft.durationSeconds,
        notes: notes.length === 0 ? null : notes,
        resolution: draft.draft.resolution,
        rewardPoints: draft.draft.rewardPoints,
        wasCompletedInSession: draft.draft.wasCompletedInSession,
      })
    }
    case 'defers': {
      const reason = draft.draft.reason.trim()
      return makeDefer({
        made: now,
        reason: reason.length === 0 ? null : reason,
        target: draft.draft.target,
      })
    }
    case 'shadows': {
      const group = draft.draft.group.trim()
      return makeShadow({
        originalTitle: draft.draft.originalTitle.trim(),
        sourceIdentifier: draft.draft.sourceIdentifier.trim(),
        kind: draft.draft.kind,
        source: draft.draft.source.trim(),
        group: group.length === 0 ? null : group,
      })
    }
    default:
      return null
  }
}

/* ------------------------------------------------------------------------ */
/* Small controls                                                            */
/* ------------------------------------------------------------------------ */

function Field({
  label,
  htmlFor,
  children,
}: {
  readonly label: string
  readonly htmlFor: string
  readonly children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-kro-tiny">
      <label
        htmlFor={htmlFor}
        className="text-sm"
        style={{ color: colorVar('foreSecondary') }}
      >
        {label}
      </label>
      {children}
    </div>
  )
}

function NativeSelect({
  id,
  value,
  options,
  disabled,
  onChange,
}: {
  readonly id: string
  readonly value: string
  readonly options: readonly { readonly value: string; readonly label: string }[]
  readonly disabled: boolean
  readonly onChange: (value: string) => void
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-kro-field px-kro-small text-sm outline-none focus-visible:shadow-[var(--kro-ring)] disabled:opacity-[var(--kro-opacity-disabled)]"
      style={{
        backgroundColor: colorVar('backInner'),
        color: colorVar('fore'),
        minHeight: 'var(--kro-size-min-touch-target)',
      }}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

function IconButton({
  label,
  isDestructive,
  disabled,
  onPress,
  children,
}: {
  readonly label: string
  readonly isDestructive?: boolean
  readonly disabled: boolean
  readonly onPress: () => void
  readonly children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onPress}
      className="inline-flex shrink-0 items-center justify-center rounded-kro-pill outline-none focus-visible:shadow-[var(--kro-ring)] disabled:opacity-[var(--kro-opacity-disabled)]"
      style={{
        minWidth: 'var(--kro-size-min-touch-target)',
        minHeight: 'var(--kro-size-min-touch-target)',
        color: isDestructive === true
          ? colorVar('bannerDanger')
          : colorVar('foreSecondary'),
      }}
    >
      {children}
    </button>
  )
}
