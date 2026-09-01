'use client'

/**
 * The Integrations pane — canon `IntegrationsView` plus its `IntegrationRowView`
 * (`RC-15`: passive; every intent is a callback prop).
 *
 * Canon's trailing affordance is a three-way: a green check when connected, a
 * spinner while connecting, an enabled Connect for `google` and a **disabled**
 * Connect for everything else. That last branch is the interesting one — canon
 * ships two Apple rows whose buttons are `.disabled(true)` on the platform that
 * has EventKit. The web keeps the rows and says why, rather than offering a
 * control that does nothing when pressed.
 *
 * The Google row has four states here, not two, because on the web a
 * deployment can genuinely have no Google client (`unconfigured`) and a grant
 * can genuinely stop working (`needsReconnect`). See `SettingsIntegrations.ts`.
 */
import { colorVar } from '../../../design/system/tokens/roles'
import { InlineBanner } from '../../../design/endeavor/InlineBanner'
import { SurfaceCard } from '../../../design/endeavor/SurfaceCard'
import { cn } from '../../../design/system/utils/cn'
import { IntegrationAction, type IntegrationRow } from '../SettingsIntegrations'
import { settingsIcon } from './settingsIcons'

export interface IntegrationsSectionFragmentProps {
  readonly rows: readonly IntegrationRow[]
  /** Copy for a failure banner, or `null`. */
  readonly errorCopy?: string | null
  readonly onTapConnect: (id: string) => void
  readonly onTapDisconnect: (id: string) => void
}

export function IntegrationsSectionFragment({
  rows,
  errorCopy = null,
  onTapConnect,
  onTapDisconnect,
}: IntegrationsSectionFragmentProps) {
  return (
    <div
      data-testid="integrations-section"
      className="flex w-full flex-col gap-kro-medium"
    >
      {errorCopy === null ? null : (
        <InlineBanner kind="warning" message={errorCopy} />
      )}

      <SurfaceCard padding={null}>
        <div className="flex w-full flex-col">
          {rows.map((row, index) => (
            <Row
              key={row.id}
              row={row}
              isFirst={index === 0}
              onTapConnect={onTapConnect}
              onTapDisconnect={onTapDisconnect}
            />
          ))}
        </div>
      </SurfaceCard>
    </div>
  )
}

function Row({
  row,
  isFirst,
  onTapConnect,
  onTapDisconnect,
}: {
  readonly row: IntegrationRow
  readonly isFirst: boolean
  readonly onTapConnect: (id: string) => void
  readonly onTapDisconnect: (id: string) => void
}) {
  const Icon = settingsIcon(row.glyph)

  return (
    <>
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
        data-testid="integration-row"
        data-integration={row.id}
        data-action={row.action}
        className="flex w-full items-center gap-kro-small px-kro-medium py-3"
      >
        <Icon
          size={22}
          strokeWidth={1.75}
          aria-hidden
          className="shrink-0"
          style={{ color: colorVar('foreSecondary') }}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="text-[15px]" style={{ color: colorVar('fore') }}>
            {row.title}
          </span>
          <span
            className="text-[13px] leading-snug"
            style={{ color: colorVar('foreSecondary') }}
          >
            {row.subtitle}
          </span>
        </div>
        <Trailing
          row={row}
          onTapConnect={onTapConnect}
          onTapDisconnect={onTapDisconnect}
        />
      </div>
    </>
  )
}

function Trailing({
  row,
  onTapConnect,
  onTapDisconnect,
}: {
  readonly row: IntegrationRow
  readonly onTapConnect: (id: string) => void
  readonly onTapDisconnect: (id: string) => void
}) {
  switch (row.action) {
    case IntegrationAction.none:
      // Canon's green check. Paired with a spoken label, never colour alone.
      return <ConnectedMark title={row.title} />
    case IntegrationAction.busy:
      return (
        <span
          data-testid="integration-busy"
          role="status"
          aria-label={`${row.title} — working…`}
          className="shrink-0 text-[13px]"
          style={{ color: colorVar('foreSecondary') }}
        >
          Working…
        </span>
      )
    case IntegrationAction.connect:
      return (
        <RowButton
          label={`Connect ${row.title}`}
          title="Connect"
          onClick={() => onTapConnect(row.id)}
        />
      )
    case IntegrationAction.reconnect:
      return (
        <RowButton
          label={`Reconnect ${row.title}`}
          title="Reconnect"
          onClick={() => onTapConnect(row.id)}
        />
      )
    case IntegrationAction.disconnect:
      return (
        <div className="flex shrink-0 items-center gap-kro-small">
          <ConnectedMark title={row.title} />
          <RowButton
            label={`Disconnect ${row.title}`}
            title="Disconnect"
            onClick={() => onTapDisconnect(row.id)}
          />
        </div>
      )
    case IntegrationAction.unavailable:
      return (
        <RowButton
          label={`Connect ${row.title}`}
          title="Connect"
          isDisabled
          onClick={() => onTapConnect(row.id)}
        />
      )
  }
}

function ConnectedMark({ title }: { readonly title: string }) {
  const Icon = settingsIcon('checkmark.circle.fill')
  return (
    <span
      data-testid="integration-connected"
      className="flex shrink-0 items-center gap-1 text-[13px] font-medium"
      style={{ color: colorVar('badgeGreen') }}
    >
      <Icon size={16} strokeWidth={2.5} aria-hidden />
      <span className="sr-only">{`${title} — `}</span>
      Connected
    </span>
  )
}

function RowButton({
  label,
  title,
  isDisabled = false,
  onClick,
}: {
  readonly label: string
  readonly title: string
  readonly isDisabled?: boolean
  readonly onClick: () => void
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 shrink-0 items-center rounded-kro-small border px-3',
        'text-[13px] font-semibold outline-none focus-visible:shadow-[var(--kro-ring)]',
        'disabled:cursor-not-allowed',
      )}
      style={{
        borderColor: colorVar('hairline'),
        color: colorVar('accent'),
        // The one place disabled opacity is applied for this control (UX: once
        // per control, never stacked).
        opacity: isDisabled ? 0.62 : undefined,
      }}
    >
      {title}
    </button>
  )
}
