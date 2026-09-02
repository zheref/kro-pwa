'use client'

/**
 * One preferences pane, rendered **from the schema** — canon's five
 * `…PreferencesView`s as a single passive Fragment (`RC-15`: it reads nothing
 * and dispatches nothing; every value and every intent is a prop).
 *
 * ## Why one Fragment and not five
 *
 * Canon has five views because SwiftUI has no way to say "a row per declared
 * option": each `@Binding` is typed, so each form is hand-written. Here the
 * rows come from `settingSubgroupsFor(group)`, which is derived from
 * `@kro/core`'s `settingOptionsByGroup` — so a schema option cannot be declared
 * and then silently not offered, and the five panes cannot drift apart. The
 * *copy* is still canon's, per key (`SettingsElements`).
 *
 * ## Canon behaviours ported here rather than invented
 *
 * - **Disabled until loaded.** Canon: `.disabled(!isLoaded)` on every form,
 *   *"so an edit made in the brief pre-load window isn't dropped by the
 *   persistence guard and then overwritten by the load"*.
 * - **The working-hours warning.** Canon's `footer:` on the Working Hours
 *   section, shown when the end is not after the start, **while the values
 *   persist as entered**. So it is rendered state, never a rejected write.
 * - **"On this device".** Canon's `SettingScopeBadge` / `LocalBadge`, driven
 *   off `syncScope` in the schema rather than a per-row flag.
 * - **"Declared, not yet consumed".** Canon says this only in prose;
 *   KC-IS-#11 moved it into the schema, so the row can say it. Parity means
 *   not inventing a consumer — and telling the user which controls are inert
 *   is more honest than a control that silently does nothing.
 */
import type { SettingValue, WeekDay } from '@kro/core'
import { type SettingGroup, weekDays } from '@kro/core'
import {
  APP_PALETTES,
  appPaletteNamed,
} from '../../../design/system/tokens/appPalette'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import { SurfaceCard } from '../../../design/endeavor/SurfaceCard'
import { InlineBanner } from '../../../design/endeavor/InlineBanner'
import {
  FieldSectionLabel,
  OnGradient,
} from '../../../design/system/gradient/OnGradient'
import type {
  SettingControl,
  SettingElement,
  SettingSubgroup,
} from '../SettingsElements'
import {
  settingSubgroupsFor,
  settingSubgroupsForAppearance,
} from '../SettingsElements'
import { settingValueIn } from '../SettingsSelectors'
import { settingsIcon } from './settingsIcons'
import {
  accentSwatchColor,
  deviceTimeZone,
  knownTimeZones,
  timeInputMinutes,
  timeInputValue,
  timeZoneLabel,
  weekDayLetter,
  weekDayName,
  weekDaysBitmaskHas,
  weekDaysBitmaskToggling,
} from './settingsFormatting'

export interface PreferencesSectionFragmentProps {
  /**
   * Which pane this renders. `'appearance'` is the Theme + Palette pane,
   * which is not a `SettingGroup`.
   */
  readonly group: SettingGroup | 'appearance'
  /** The current snapshot. A missing key falls back to the declared default. */
  readonly values: Readonly<Record<string, SettingValue | null>>
  /** Canon's `isLoaded` — the whole form is inert until the values arrive. */
  readonly isLoaded: boolean
  /**
   * Whether the working day ends after it starts. Only the General pane draws
   * anything for it; every other pane passes the default.
   */
  readonly isWorkingHoursValid?: boolean
  /**
   * When on, General hides Theme and Accent — Appearance owns them.
   */
  readonly isAppearanceThemesEnabled?: boolean
  /** Copy for a failure banner above the form, or `null`. */
  readonly errorCopy?: string | null
  readonly onChangeSetting: (key: string, value: SettingValue) => void
}

/** The subgroup whose footer carries canon's working-hours warning. */
const WORKING_HOURS_SUBGROUP = 'workingHours'

export function PreferencesSectionFragment({
  group,
  values,
  isLoaded,
  isWorkingHoursValid = true,
  isAppearanceThemesEnabled = false,
  errorCopy = null,
  onChangeSetting,
}: PreferencesSectionFragmentProps) {
  const subgroups =
    group === 'appearance'
      ? settingSubgroupsForAppearance()
      : settingSubgroupsFor(group, { isAppearanceThemesEnabled })

  return (
    <div
      data-testid="preferences-section"
      data-group={group}
      className="flex w-full flex-col gap-kro-large"
    >
      {errorCopy === null ? null : (
        <InlineBanner kind="warning" message={errorCopy} />
      )}

      {subgroups.map((subgroup) => (
        <Subgroup
          key={subgroup.id}
          subgroup={subgroup}
          values={values}
          isLoaded={isLoaded}
          isWorkingHoursValid={isWorkingHoursValid}
          onChangeSetting={onChangeSetting}
        />
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Subgroup — canon's `Section { … } header: … footer: …`
// ---------------------------------------------------------------------------

function Subgroup({
  subgroup,
  values,
  isLoaded,
  isWorkingHoursValid,
  onChangeSetting,
}: {
  readonly subgroup: SettingSubgroup
  readonly values: Readonly<Record<string, SettingValue | null>>
  readonly isLoaded: boolean
  readonly isWorkingHoursValid: boolean
  readonly onChangeSetting: (key: string, value: SettingValue) => void
}) {
  const showsWorkingHoursWarning =
    subgroup.id === WORKING_HOURS_SUBGROUP && !isWorkingHoursValid

  return (
    <section
      data-testid="preferences-subgroup"
      data-subgroup={subgroup.id}
      className="flex w-full flex-col gap-kro-small"
    >
      {subgroup.title === null ? null : (
        <FieldSectionLabel>{subgroup.title}</FieldSectionLabel>
      )}

      <SurfaceCard padding={null}>
        <div className="flex w-full flex-col">
          {subgroup.elements.map((element, index) => (
            <SettingRow
              key={element.option.key}
              element={element}
              value={settingValueIn(values, element.option)}
              isLoaded={isLoaded}
              isFirst={index === 0}
              onChangeSetting={onChangeSetting}
            />
          ))}
        </div>
      </SurfaceCard>

      {showsWorkingHoursWarning ? (
        // Canon: `Label("End time must be after start time.", systemImage:
        // "exclamationmark.triangle").foregroundStyle(.orange)`. Paired glyph +
        // text, never colour alone (UX: every coloured signal carries both).
        <p
          role="status"
          data-testid="working-hours-warning"
          className="m-0 flex items-center gap-kro-tiny px-kro-tiny text-[13px] font-medium"
          style={{ color: colorVar('badgeOrange') }}
        >
          <WarningGlyph />
          End time must be after start time.
        </p>
      ) : null}

      {subgroup.footnote === null ? null : (
        <OnGradient as="p" className="m-0 px-kro-tiny text-[13px] leading-snug">
          {subgroup.footnote}
        </OnGradient>
      )}
    </section>
  )
}

function WarningGlyph() {
  const Icon = settingsIcon('exclamationmark.triangle')
  return <Icon size={14} strokeWidth={2.5} aria-hidden />
}

// ---------------------------------------------------------------------------
// One row
// ---------------------------------------------------------------------------

function SettingRow({
  element,
  value,
  isLoaded,
  isFirst,
  onChangeSetting,
}: {
  readonly element: SettingElement
  readonly value: SettingValue | null
  readonly isLoaded: boolean
  readonly isFirst: boolean
  readonly onChangeSetting: (key: string, value: SettingValue) => void
}) {
  const Icon = settingsIcon(element.option.glyph ?? '')
  const controlId = `setting-${element.option.key.split('.').join('-')}`
  const isStacked =
    element.control.kind === 'days' ||
    element.control.kind === 'swatches' ||
    element.control.kind === 'paletteSwatches' ||
    element.control.kind === 'timezone'

  return (
    <div
      data-testid="setting-row"
      data-setting-key={element.option.key}
      className="flex w-full flex-col"
    >
      {isFirst ? null : (
        <div
          aria-hidden
          style={{
            height: '0.75px',
            marginLeft: 'var(--kro-space-medium)',
            backgroundColor: colorVar('hairline'),
          }}
        />
      )}
      <div
        className={cn(
          'flex w-full gap-kro-small px-kro-medium py-2.5',
          isStacked ? 'flex-col items-stretch' : 'flex-row items-center',
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-kro-small">
          <Icon
            size={16}
            strokeWidth={2}
            aria-hidden
            className="shrink-0"
            style={{ color: colorVar('foreSecondary') }}
          />
          <label
            htmlFor={controlId}
            className="min-w-0 text-[15px]"
            style={{ color: colorVar('fore') }}
          >
            {element.label}
          </label>
          {element.isDeviceLocal ? <ScopeBadge /> : null}
          {element.isConsumed ? null : <DeclaredBadge />}
        </div>

        <div className={cn('flex', isStacked ? 'w-full' : 'shrink-0')}>
          <SettingControlView
            controlId={controlId}
            label={element.label}
            control={element.control}
            optionKey={element.option.key}
            value={value}
            isDisabled={!isLoaded}
            onChangeSetting={onChangeSetting}
          />
        </div>
      </div>
    </div>
  )
}

/** Canon's `SettingScopeBadge` / `LocalBadge` — "On this device". */
function ScopeBadge() {
  return (
    <span
      data-testid="scope-badge"
      className="shrink-0 rounded-kro-pill px-1.5 py-0.5 text-[11px] font-medium"
      style={{
        backgroundColor: colorVar('backInner'),
        color: colorVar('foreSecondary'),
      }}
    >
      On this device
    </span>
  )
}

/**
 * The schema's `consumption: 'declared'`.
 *
 * Canon records this in prose only, so a KroApple user meets a control that
 * quietly changes nothing. Saying it is the honest port — and the epic's rule
 * is that parity means not inventing a consumer, not hiding the option.
 */
function DeclaredBadge() {
  return (
    <span
      data-testid="declared-badge"
      title="Stored, but nothing reads it yet."
      className="shrink-0 rounded-kro-pill px-1.5 py-0.5 text-[11px] font-medium"
      style={{
        backgroundColor: colorVar('backInner'),
        color: colorVar('foreSecondary'),
      }}
    >
      Not used yet
    </span>
  )
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

interface ControlProps {
  readonly controlId: string
  readonly label: string
  readonly control: SettingControl
  readonly optionKey: string
  readonly value: SettingValue | null
  readonly isDisabled: boolean
  readonly onChangeSetting: (key: string, value: SettingValue) => void
}

function SettingControlView(props: ControlProps) {
  switch (props.control.kind) {
    case 'toggle':
      return <ToggleControl {...props} />
    case 'time':
      return <TimeControl {...props} />
    case 'days':
      return <DaysControl {...props} />
    case 'stepper':
      return <StepperControl {...props} bounds={props.control} />
    case 'choice':
      return <ChoiceControl {...props} choices={props.control.choices} />
    case 'swatches':
      return <SwatchControl {...props} choices={props.control.choices} />
    case 'paletteSwatches':
      return <PaletteSwatchControl {...props} choices={props.control.choices} />
    case 'timezone':
      return <TimeZoneControl {...props} />
  }
}

const FIELD_CLASSES = cn(
  'h-9 rounded-kro-field border px-2 text-[15px]',
  'outline-none focus-visible:shadow-[var(--kro-ring)]',
  'disabled:cursor-not-allowed',
)

const fieldStyle = {
  backgroundColor: colorVar('backInner'),
  borderColor: colorVar('hairline'),
  color: colorVar('fore'),
}

/** Canon's `Toggle`. A `role="switch"` button — the accessible equivalent. */
function ToggleControl({
  controlId,
  label,
  optionKey,
  value,
  isDisabled,
  onChangeSetting,
}: ControlProps) {
  const isOn = value === true
  return (
    <button
      id={controlId}
      type="button"
      role="switch"
      aria-checked={isOn}
      aria-label={label}
      disabled={isDisabled}
      onClick={() => onChangeSetting(optionKey, !isOn)}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-kro-pill p-0.5',
        'transition-colors outline-none focus-visible:shadow-[var(--kro-ring)]',
        'disabled:cursor-not-allowed',
      )}
      style={{
        backgroundColor: isOn ? colorVar('accent') : colorVar('hairline'),
        opacity: isDisabled ? 0.62 : undefined,
      }}
    >
      <span
        aria-hidden
        className="block size-6 rounded-full transition-transform"
        style={{
          backgroundColor: colorVar('absolute'),
          transform: isOn ? 'translateX(20px)' : 'translateX(0)',
        }}
      />
    </button>
  )
}

/** Canon's `DatePicker(displayedComponents: .hourAndMinute)`. */
function TimeControl({
  controlId,
  label,
  optionKey,
  value,
  isDisabled,
  onChangeSetting,
}: ControlProps) {
  const minutes = typeof value === 'number' ? value : 0
  return (
    <input
      id={controlId}
      type="time"
      aria-label={label}
      disabled={isDisabled}
      value={timeInputValue(minutes)}
      onChange={(event) => {
        const next = timeInputMinutes(event.target.value)
        // `null` is a half-typed field, not midnight — see `timeInputMinutes`.
        if (next !== null) onChangeSetting(optionKey, next)
      }}
      className={FIELD_CLASSES}
      style={{ ...fieldStyle, opacity: isDisabled ? 0.62 : undefined }}
    />
  )
}

/** Canon's seven-chip `WeekDayPicker`. */
function DaysControl({
  controlId,
  label,
  optionKey,
  value,
  isDisabled,
  onChangeSetting,
}: ControlProps) {
  const mask = typeof value === 'number' ? value : 0
  return (
    <div
      id={controlId}
      role="group"
      aria-label={label}
      className="flex w-full items-center gap-1.5"
    >
      {weekDays.map((day: WeekDay) => {
        const isOn = weekDaysBitmaskHas(mask, day)
        return (
          <button
            key={day}
            type="button"
            aria-pressed={isOn}
            aria-label={weekDayName(day)}
            disabled={isDisabled}
            onClick={() =>
              onChangeSetting(optionKey, weekDaysBitmaskToggling(mask, day))
            }
            className={cn(
              'flex h-9 flex-1 items-center justify-center rounded-full text-[13px] font-semibold',
              'outline-none focus-visible:shadow-[var(--kro-ring)]',
              'disabled:cursor-not-allowed',
            )}
            style={{
              backgroundColor: isOn
                ? colorVar('accent')
                : colorVar('backInner'),
              color: isOn ? colorVar('onAccent') : colorVar('fore'),
              opacity: isDisabled ? 0.62 : undefined,
            }}
          >
            {weekDayLetter(day)}
          </button>
        )
      })}
    </div>
  )
}

/** Canon's `Stepper(… in: … step: …)`. */
function StepperControl({
  controlId,
  label,
  optionKey,
  value,
  isDisabled,
  bounds,
  onChangeSetting,
}: ControlProps & {
  readonly bounds: {
    min: number
    max: number
    step: number
    unit: string | null
  }
}) {
  const current = typeof value === 'number' ? value : bounds.min
  const summary =
    bounds.unit === null ? `${current}` : `${current} ${bounds.unit}`
  const step = (delta: number) => {
    const next = Math.min(
      Math.max(current + delta * bounds.step, bounds.min),
      bounds.max,
    )
    if (next !== current) onChangeSetting(optionKey, next)
  }

  return (
    <div id={controlId} className="flex items-center gap-kro-small">
      <output
        data-testid="stepper-value"
        className="min-w-16 text-right text-[15px] tabular-nums"
        style={{ color: colorVar('foreSecondary') }}
      >
        {summary}
      </output>
      <div
        className="flex items-center overflow-hidden rounded-kro-field border"
        style={{ borderColor: colorVar('hairline') }}
      >
        <StepperButton
          label={`Decrease ${label}`}
          glyph="−"
          isDisabled={isDisabled || current <= bounds.min}
          onClick={() => step(-1)}
        />
        <div
          aria-hidden
          style={{
            width: '0.75px',
            height: 28,
            backgroundColor: colorVar('hairline'),
          }}
        />
        <StepperButton
          label={`Increase ${label}`}
          glyph="+"
          isDisabled={isDisabled || current >= bounds.max}
          onClick={() => step(1)}
        />
      </div>
    </div>
  )
}

function StepperButton({
  label,
  glyph,
  isDisabled,
  onClick,
}: {
  readonly label: string
  readonly glyph: string
  readonly isDisabled: boolean
  readonly onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        'flex h-9 w-9 items-center justify-center text-[17px] leading-none',
        'outline-none focus-visible:shadow-[var(--kro-ring)]',
        'disabled:cursor-not-allowed',
      )}
      style={{
        backgroundColor: colorVar('backInner'),
        color: colorVar('fore'),
        opacity: isDisabled ? 0.62 : undefined,
      }}
    >
      {glyph}
    </button>
  )
}

/** Canon's `Picker`. */
function ChoiceControl({
  controlId,
  label,
  optionKey,
  value,
  isDisabled,
  choices,
  onChangeSetting,
}: ControlProps & {
  readonly choices: readonly { value: string; label: string }[]
}) {
  return (
    <select
      id={controlId}
      aria-label={label}
      disabled={isDisabled}
      value={typeof value === 'string' ? value : ''}
      onChange={(event) => onChangeSetting(optionKey, event.target.value)}
      className={FIELD_CLASSES}
      style={{ ...fieldStyle, opacity: isDisabled ? 0.62 : undefined }}
    >
      {choices.map((choice) => (
        <option key={choice.value} value={choice.value}>
          {choice.label}
        </option>
      ))}
    </select>
  )
}

/** Canon's `AccentColorPicker` — a swatch per choice, the current one ringed. */
function SwatchControl({
  controlId,
  label,
  optionKey,
  value,
  isDisabled,
  choices,
  onChangeSetting,
}: ControlProps & {
  readonly choices: readonly { value: string; label: string }[]
}) {
  return (
    <div
      id={controlId}
      role="radiogroup"
      aria-label={label}
      className="flex w-full items-center gap-kro-small"
    >
      {choices.map((choice) => {
        const isSelected = value === choice.value
        return (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={choice.label}
            disabled={isDisabled}
            onClick={() => onChangeSetting(optionKey, choice.value)}
            className={cn(
              'size-7 rounded-full outline-none focus-visible:shadow-[var(--kro-ring)]',
              'disabled:cursor-not-allowed',
            )}
            style={{
              backgroundColor: accentSwatchColor(choice.value),
              boxShadow: isSelected
                ? `0 0 0 2px ${colorVar('absolute')}, 0 0 0 4px ${colorVar('fore')}`
                : undefined,
              opacity: isDisabled ? 0.62 : undefined,
            }}
          />
        )
      })}
    </div>
  )
}

/**
 * Canon's `PaletteSwatch` grid — each cell paints the exact two-stop ramp a
 * page will wear, so what the picker promises is what the app delivers.
 */
function PaletteSwatchControl({
  controlId,
  label,
  optionKey,
  value,
  isDisabled,
  choices,
  onChangeSetting,
}: ControlProps & {
  readonly choices: readonly { value: string; label: string }[]
}) {
  const CheckIcon = settingsIcon('checkmark')
  const selected = typeof value === 'string' ? appPaletteNamed(value) : 'purple'

  return (
    <div
      id={controlId}
      role="radiogroup"
      aria-label={label}
      className="grid w-full grid-cols-2 gap-kro-small"
    >
      {choices.map((choice) => {
        const isSelected = selected === choice.value
        const spec = APP_PALETTES[appPaletteNamed(choice.value)]
        return (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={choice.label}
            disabled={isDisabled}
            onClick={() => onChangeSetting(optionKey, choice.value)}
            className={cn(
              'relative flex min-h-16 flex-col justify-end overflow-hidden rounded-kro-medium p-kro-small',
              'outline-none focus-visible:shadow-[var(--kro-ring)]',
              'disabled:cursor-not-allowed',
            )}
            style={{
              backgroundImage: `linear-gradient(135deg, ${spec.light.start}, ${spec.light.end})`,
              boxShadow: isSelected
                ? `0 0 0 2px ${colorVar('absolute')}, 0 0 0 4px ${colorVar('fore')}`
                : `inset 0 0 0 1px ${colorVar('hairline')}`,
              opacity: isDisabled ? 0.62 : undefined,
              color: '#f7f7ff',
            }}
          >
            {isSelected ? (
              <CheckIcon
                size={16}
                strokeWidth={2.5}
                aria-hidden
                className="absolute top-2 right-2"
              />
            ) : null}
            <span className="text-[13px] font-medium">{choice.label}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Canon's timezone `Picker` over the known identifiers.
 *
 * The empty value is a real choice, not a placeholder: the schema's default for
 * `general.timezone` is `null`, which canon documents as *"defaults to the
 * device's current zone until changed"*. So the first option names the device's
 * zone and writing it stores that identifier, which is what "until changed"
 * means.
 */
function TimeZoneControl({
  controlId,
  label,
  optionKey,
  value,
  isDisabled,
  onChangeSetting,
}: ControlProps) {
  const zones = knownTimeZones()
  const device = deviceTimeZone()
  const current = typeof value === 'string' && value.length > 0 ? value : device

  return (
    <select
      id={controlId}
      aria-label={label}
      disabled={isDisabled}
      value={zones.includes(current) ? current : ''}
      onChange={(event) => onChangeSetting(optionKey, event.target.value)}
      className={cn(FIELD_CLASSES, 'w-full')}
      style={{ ...fieldStyle, opacity: isDisabled ? 0.62 : undefined }}
    >
      {zones.includes(current) ? null : (
        <option value="">{timeZoneLabel(current)}</option>
      )}
      {zones.map((zone) => (
        <option key={zone} value={zone}>
          {timeZoneLabel(zone)}
        </option>
      ))}
    </select>
  )
}
