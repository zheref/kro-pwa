'use client'

/**
 * The Edit form — canon's `EndeavorEditView`, rendered from the **matrix** and
 * nothing else (`RC-15`).
 *
 * ## Acceptance criterion, structurally
 *
 * `#29`'s `EndeavorDetailEditing` header states the contract this Fragment is
 * the second half of: *"the surface can tell in advance"* — `editableSections`
 * derives the per-kind field set from `EndeavorFieldRelevance`, so a field the
 * matrix forbids is **absent** rather than offered and silently dropped. This
 * file therefore contains no per-kind `if` at all: it maps the sections it was
 * given. A calendar event's form has no Due row because the matrix says so, and
 * the only way to change that is to change the matrix.
 *
 * Every control is additionally **disabled while a save is in flight**, which
 * is canon's own rule on every relation screen (`isSaving` disables the form so
 * a double-tap cannot race the write).
 *
 * ## Duration is a link, not a field
 *
 * Canon gives the three duration bounds their own screen
 * (`EndeavorDurationFeature`, which embeds this very edit state and reports one
 * `durationProfile` change). So the Duration row here opens that screen rather
 * than editing a single number — which is also what keeps the minimum/maximum
 * invariant in one place instead of three loose inputs.
 */
import {
  type AnyEndeavorList,
  type Endeavor,
  EndeavorField,
  type EndeavorTag,
  type Month,
  type RepeatBaseType,
  type WeekDay,
  assertNever,
  endeavorStatusDisplayName,
  endeavorStatuses,
  endeavorTags,
  monthsOfYear,
  weekDays,
} from '@kro/core'
import { InlineBanner } from '../../../design/endeavor/InlineBanner'
import { KroChip, semanticTint } from '../../../design/endeavor/KroChip'
import { SectionCard } from '../../../design/endeavor/SurfaceCard'
import {
  localInputValue,
  parseLocalInput,
} from '../../../design/endeavor/endeavorPopovers'
import { Input } from '../../../design/system/primitives/input'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import type { EndeavorDetailSectionModel } from '../EndeavorDetailEditing'
import type { EndeavorFieldChange } from '../EndeavorDetailEditing'
import type { EndeavorDetailException } from '../EndeavorDetailException'
import { formatDuration } from '../../../design/endeavor/formatting'
import {
  WEEKDAY_SHORT,
  fieldLabel,
  repeatSummary,
  tagLabel,
} from './endeavorDetailDisplay'
import { HIDDEN_SCROLLBAR_STYLE } from './EndeavorDetailFragment'

export interface EndeavorEditFragmentProps {
  /** The editor's working copy — never the saved endeavor. */
  readonly working: Endeavor
  /** Only the sections with at least one **editable** field for this kind. */
  readonly sections: readonly EndeavorDetailSectionModel[]
  /** Canon's `isTitleValidSelector` — the one v1 validation rule. */
  readonly isValid: boolean
  readonly isSaving: boolean
  readonly exception: EndeavorDetailException | null
  /** The lists a project can be assigned to. Empty is a valid state. */
  readonly projects: readonly AnyEndeavorList[]
  readonly onChangeField: (change: EndeavorFieldChange) => void
  /** Opens the three-bound duration profile — canon's own child screen. */
  readonly onOpenDuration: () => void
}

export function EndeavorEditFragment({
  working,
  sections,
  isValid,
  isSaving,
  exception,
  projects,
  onChangeField,
  onOpenDuration,
}: EndeavorEditFragmentProps) {
  return (
    <div
      data-testid="endeavor-edit"
      className="flex min-h-0 flex-1 flex-col gap-kro-large overflow-y-auto pb-kro-x-large [&>*]:shrink-0 [&::-webkit-scrollbar]:hidden"
      style={HIDDEN_SCROLLBAR_STYLE}
    >
      {exception === null ? null : <InlineBanner message={exception.message} />}

      {isValid ? null : (
        <InlineBanner
          kind="warning"
          message="Give this endeavor a title before saving."
        />
      )}

      {sections.map((section) => (
        <SectionCard key={section.section} title={section.title}>
          <div className="flex flex-col gap-kro-medium">
            {section.fields.map((field) => (
              <EditField
                key={field}
                field={field}
                working={working}
                isSaving={isSaving}
                projects={projects}
                onChangeField={onChangeField}
                onOpenDuration={onOpenDuration}
              />
            ))}
          </div>
        </SectionCard>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------------ */
/* One field                                                                 */
/* ------------------------------------------------------------------------ */

function EditField({
  field,
  working,
  isSaving,
  projects,
  onChangeField,
  onOpenDuration,
}: {
  readonly field: EndeavorField
  readonly working: Endeavor
  readonly isSaving: boolean
  readonly projects: readonly AnyEndeavorList[]
  readonly onChangeField: (change: EndeavorFieldChange) => void
  readonly onOpenDuration: () => void
}) {
  const label = fieldLabel(field)

  switch (field) {
    case EndeavorField.title:
      return (
        <Labelled label={label} htmlFor={`edit-${field}`}>
          <Input
            id={`edit-${field}`}
            value={working.title}
            disabled={isSaving}
            onChange={(event) =>
              onChangeField({ field: 'title', value: event.target.value })
            }
          />
        </Labelled>
      )

    case EndeavorField.status:
      return (
        <Labelled label={label} htmlFor={`edit-${field}`}>
          <Select
            id={`edit-${field}`}
            value={working.status}
            disabled={isSaving}
            onChange={(value) =>
              onChangeField({
                field: 'status',
                value: value as Endeavor['status'],
              })
            }
            options={endeavorStatuses.map((status) => ({
              value: status,
              label: endeavorStatusDisplayName(status),
            }))}
          />
        </Labelled>
      )

    case EndeavorField.due:
    case EndeavorField.start:
    case EndeavorField.expiry:
      return (
        <Labelled label={label} htmlFor={`edit-${field}`}>
          <Input
            id={`edit-${field}`}
            type="datetime-local"
            disabled={isSaving}
            value={dateInputValue(working, field)}
            onChange={(event) =>
              onChangeField({
                field,
                value: parseLocalInput(event.target.value),
              })
            }
          />
        </Labelled>
      )

    case EndeavorField.duration:
      return (
        <div className="flex items-center gap-kro-small">
          <span
            className="flex-1 text-sm"
            style={{ color: colorVar('foreSecondary') }}
          >
            {label}
          </span>
          <span
            className="text-sm font-semibold"
            style={{ color: colorVar('fore') }}
          >
            {working.duration === null
              ? 'Not set'
              : formatDuration(working.duration)}
          </span>
          <button
            type="button"
            disabled={isSaving}
            onClick={onOpenDuration}
            className="rounded-kro-small px-kro-small text-sm font-semibold outline-none focus-visible:shadow-[var(--kro-ring)] disabled:opacity-[var(--kro-opacity-disabled)]"
            style={{
              color: colorVar('accent'),
              minHeight: 'var(--kro-size-min-touch-target)',
            }}
          >
            Edit profile
          </button>
        </div>
      )

    case EndeavorField.sessionPoints:
      return (
        <NumberField
          id={`edit-${field}`}
          label={label}
          value={working.sessionPoints}
          min={0}
          max={999}
          step={5}
          disabled={isSaving}
          onChange={(value) => onChangeField({ field: 'sessionPoints', value })}
        />
      )

    case EndeavorField.value:
      return (
        <NumberField
          id={`edit-${field}`}
          label={label}
          value={working.value}
          min={1}
          max={5}
          step={1}
          disabled={isSaving}
          onChange={(value) => onChangeField({ field: 'value', value })}
        />
      )

    case EndeavorField.effort:
      return (
        <NumberField
          id={`edit-${field}`}
          label={label}
          value={working.effort}
          min={1}
          max={5}
          step={1}
          disabled={isSaving}
          onChange={(value) => onChangeField({ field: 'effort', value })}
        />
      )

    case EndeavorField.tags:
      return (
        <fieldset className="m-0 border-0 p-0">
          <legend
            className="mb-kro-tiny p-0 text-sm"
            style={{ color: colorVar('foreSecondary') }}
          >
            {label}
          </legend>
          <div className="flex flex-wrap gap-kro-small">
            {endeavorTags.map((tag) => {
              const isOn = (working.tags ?? []).includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  aria-pressed={isOn}
                  disabled={isSaving}
                  data-edit-tag={tag}
                  onClick={() =>
                    onChangeField({
                      field: 'tagToggled',
                      value: tag as EndeavorTag,
                    })
                  }
                  className="inline-flex items-center rounded-kro-pill outline-none focus-visible:shadow-[var(--kro-ring)] disabled:opacity-[var(--kro-opacity-disabled)]"
                  style={{ minHeight: 'var(--kro-size-min-touch-target)' }}
                >
                  <KroChip
                    title={tagLabel(tag)}
                    icon="tag"
                    tint={semanticTint('chipNeutral')}
                    emphasis={isOn ? 'prominent' : 'outline'}
                    size="small"
                  />
                </button>
              )
            })}
          </div>
        </fieldset>
      )

    case EndeavorField.associatedColor:
      return (
        <Labelled label={label} htmlFor={`edit-${field}`}>
          <div className="flex items-center gap-kro-small">
            <input
              id={`edit-${field}`}
              type="color"
              disabled={isSaving}
              value={working.associatedColor ?? '#4f46e5'}
              onChange={(event) =>
                onChangeField({
                  field: 'associatedColor',
                  value: event.target.value,
                })
              }
              className="size-11 rounded-kro-small border-0 bg-transparent p-0"
            />
            <button
              type="button"
              disabled={isSaving || working.associatedColor === null}
              onClick={() =>
                onChangeField({ field: 'associatedColor', value: null })
              }
              className="rounded-kro-small px-kro-small text-sm outline-none focus-visible:shadow-[var(--kro-ring)] disabled:opacity-[var(--kro-opacity-disabled)]"
              style={{
                color: colorVar('foreSecondary'),
                minHeight: 'var(--kro-size-min-touch-target)',
              }}
            >
              Clear
            </button>
          </div>
        </Labelled>
      )

    case EndeavorField.project:
      return (
        <Labelled label={label} htmlFor={`edit-${field}`}>
          <Select
            id={`edit-${field}`}
            value={working.list?.id ?? ''}
            disabled={isSaving}
            onChange={(value) =>
              onChangeField({
                field: 'project',
                value: projects.find((list) => list.id === value) ?? null,
              })
            }
            options={[
              { value: '', label: 'No project' },
              ...projects.map((list) => ({
                value: list.id,
                label: list.title,
              })),
            ]}
          />
        </Labelled>
      )

    case EndeavorField.repeatConfig:
      return (
        <RepeatField
          working={working}
          isSaving={isSaving}
          onChangeField={onChangeField}
        />
      )

    default:
      return assertNever(field)
  }
}

/** The three `Date | null` fields share one input, so they share one reader. */
function dateInputValue(working: Endeavor, field: EndeavorField): string {
  const date =
    field === EndeavorField.due
      ? working.due
      : field === EndeavorField.start
        ? working.start
        : working.expiry
  return date === null ? '' : localInputValue(date)
}

/* ------------------------------------------------------------------------ */
/* Recurrence                                                                */
/* ------------------------------------------------------------------------ */

const REPEAT_OPTIONS: readonly {
  readonly value: '' | RepeatBaseType
  readonly label: string
}[] = [
  { value: '', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
]

/**
 * The recurrence editor.
 *
 * Every change rebuilds the whole `RepeatConfig` and reports it as one
 * `repeatConfig` change, because that is what the domain stores — a partial
 * edit ("weekly, no weekdays yet") is a valid intermediate state of the FORM,
 * never of the model, and `repeatSummary` prints "Weekly" for it.
 */
function RepeatField({
  working,
  isSaving,
  onChangeField,
}: {
  readonly working: Endeavor
  readonly isSaving: boolean
  readonly onChangeField: (change: EndeavorFieldChange) => void
}) {
  const config = working.repeatConfig
  const base = config?.base ?? null

  const setBase = (value: string) => {
    if (value === '') {
      onChangeField({ field: 'repeatConfig', value: null })
      return
    }
    const everyOther = config?.everyOther ?? 1
    switch (value as RepeatBaseType) {
      case 'daily':
        onChangeField({
          field: 'repeatConfig',
          value: { base: { type: 'daily' }, everyOther },
        })
        return
      case 'weekly':
        onChangeField({
          field: 'repeatConfig',
          value: { base: { type: 'weekly', weekdays: [] }, everyOther },
        })
        return
      case 'monthly':
        onChangeField({
          field: 'repeatConfig',
          value: { base: { type: 'monthly', day: 1 }, everyOther },
        })
        return
      default:
        onChangeField({
          field: 'repeatConfig',
          value: { base: { type: 'yearly', day: 1, month: 1 }, everyOther },
        })
    }
  }

  return (
    <div className="flex flex-col gap-kro-small">
      <Labelled label={fieldLabel('repeatConfig')} htmlFor="edit-repeatConfig">
        <Select
          id="edit-repeatConfig"
          value={base?.type ?? ''}
          disabled={isSaving}
          onChange={setBase}
          options={REPEAT_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      </Labelled>

      {config === null || base === null ? null : (
        <>
          <NumberField
            id="edit-repeat-every"
            label="Every"
            value={config.everyOther}
            min={1}
            max={99}
            step={1}
            disabled={isSaving}
            onChange={(value) =>
              onChangeField({
                field: 'repeatConfig',
                value: { base, everyOther: value ?? 1 },
              })
            }
          />

          {base.type === 'weekly' ? (
            <fieldset className="m-0 border-0 p-0">
              <legend
                className="mb-kro-tiny p-0 text-sm"
                style={{ color: colorVar('foreSecondary') }}
              >
                Weekdays
              </legend>
              <div className="flex flex-wrap gap-kro-small">
                {weekDays.map((day: WeekDay) => {
                  const isOn = base.weekdays.includes(day)
                  return (
                    <button
                      key={day}
                      type="button"
                      aria-pressed={isOn}
                      disabled={isSaving}
                      data-repeat-weekday={day}
                      onClick={() =>
                        onChangeField({
                          field: 'repeatConfig',
                          value: {
                            base: {
                              type: 'weekly',
                              weekdays: isOn
                                ? base.weekdays.filter((each) => each !== day)
                                : [...base.weekdays, day],
                            },
                            everyOther: config.everyOther,
                          },
                        })
                      }
                      className="inline-flex items-center rounded-kro-pill outline-none focus-visible:shadow-[var(--kro-ring)] disabled:opacity-[var(--kro-opacity-disabled)]"
                      style={{ minHeight: 'var(--kro-size-min-touch-target)' }}
                    >
                      <KroChip
                        title={WEEKDAY_SHORT[day]}
                        tint={semanticTint('chipNeutral')}
                        emphasis={isOn ? 'prominent' : 'outline'}
                        size="small"
                      />
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ) : null}

          {base.type === 'monthly' ? (
            <NumberField
              id="edit-repeat-day"
              label="Day of month"
              value={base.day}
              min={1}
              max={31}
              step={1}
              disabled={isSaving}
              onChange={(value) =>
                onChangeField({
                  field: 'repeatConfig',
                  value: {
                    base: { type: 'monthly', day: value ?? 1 },
                    everyOther: config.everyOther,
                  },
                })
              }
            />
          ) : null}

          {base.type === 'yearly' ? (
            <div className="flex gap-kro-small">
              <NumberField
                id="edit-repeat-year-day"
                label="Day"
                value={base.day}
                min={1}
                max={31}
                step={1}
                disabled={isSaving}
                onChange={(value) =>
                  onChangeField({
                    field: 'repeatConfig',
                    value: {
                      base: {
                        type: 'yearly',
                        day: value ?? 1,
                        month: base.month,
                      },
                      everyOther: config.everyOther,
                    },
                  })
                }
              />
              <Labelled label="Month" htmlFor="edit-repeat-month">
                <Select
                  id="edit-repeat-month"
                  value={String(base.month)}
                  disabled={isSaving}
                  onChange={(value) =>
                    onChangeField({
                      field: 'repeatConfig',
                      value: {
                        base: {
                          type: 'yearly',
                          day: base.day,
                          month: Number(value) as Month,
                        },
                        everyOther: config.everyOther,
                      },
                    })
                  }
                  options={monthsOfYear.map((month) => ({
                    value: String(month),
                    label: MONTH_NAMES[month],
                  }))}
                />
              </Labelled>
            </div>
          ) : null}

          <p
            className="m-0 text-sm"
            style={{ color: colorVar('foreSecondary') }}
          >
            {repeatSummary(config)}
          </p>
        </>
      )}
    </div>
  )
}

const MONTH_NAMES: Readonly<Record<Month, string>> = {
  1: 'January',
  2: 'February',
  3: 'March',
  4: 'April',
  5: 'May',
  6: 'June',
  7: 'July',
  8: 'August',
  9: 'September',
  10: 'October',
  11: 'November',
  12: 'December',
}

/* ------------------------------------------------------------------------ */
/* Small controls                                                            */
/* ------------------------------------------------------------------------ */

function Labelled({
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

function Select({
  id,
  value,
  options,
  disabled,
  onChange,
}: {
  readonly id: string
  readonly value: string
  readonly options: readonly {
    readonly value: string
    readonly label: string
  }[]
  readonly disabled: boolean
  readonly onChange: (value: string) => void
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(event) => onChange(event.target.value)}
      className={cn(
        'w-full rounded-kro-field px-kro-small text-sm outline-none',
        'focus-visible:shadow-[var(--kro-ring)]',
        'disabled:opacity-[var(--kro-opacity-disabled)]',
      )}
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

function NumberField({
  id,
  label,
  value,
  min,
  max,
  step,
  disabled,
  onChange,
}: {
  readonly id: string
  readonly label: string
  readonly value: number | null
  readonly min: number
  readonly max: number
  readonly step: number
  readonly disabled: boolean
  readonly onChange: (value: number | null) => void
}) {
  return (
    <Labelled label={label} htmlFor={id}>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        value={value === null ? '' : String(value)}
        onChange={(event) => {
          const raw = event.target.value
          onChange(raw === '' ? null : Number(raw))
        }}
      />
    </Labelled>
  )
}
