'use client'

/**
 * The Settings hub — canon `SettingsHubView`, ported row for row (`RC-15`: it
 * dispatches nothing; every intent is a callback prop).
 *
 * Canon's three `Section`s become three groups here: the lone Profile row, the
 * labelled *Preferences* group, and the unlabelled Account group (Integrations,
 * Subscription). The sync footer is canon's fourth section — *"a small footer
 * reflecting the last sync"* — and, exactly as canon does, it is **hidden
 * entirely** when there is nothing truthful to report yet.
 *
 * The Profile row carries the signed-in identity when there is one, because the
 * hub is where a user looks for it; canon reaches the same place through
 * `ProfileScreen(store:)` one push in. Signed out it is an invitation, and its
 * callback is the auth entry point rather than a push into an empty pane.
 */
import { colorVar } from '../../../design/system/tokens/roles'
import { SurfaceCard } from '../../../design/endeavor/SurfaceCard'
import { cn } from '../../../design/system/utils/cn'
import type { SettingsSyncFooter } from '../SettingsSelectors'
import type { SettingsSection, SettingsSectionId } from '../SettingsSection'
import { settingsIcon } from './settingsIcons'

export interface SettingsHubFragmentProps {
  readonly profileSection: SettingsSection
  readonly preferencesSections: readonly SettingsSection[]
  readonly accountSections: readonly SettingsSection[]
  /** `null` hides the footer entirely — canon's `syncStatus: nil`. */
  readonly syncFooter: SettingsSyncFooter | null
  /** The signed-in account's display name, or `null` when signed out. */
  readonly accountName: string | null
  readonly accountEmail: string | null
  readonly accountInitials: string
  readonly onTapSection: (id: SettingsSectionId) => void
  /** The signed-out Profile row's action — canon's `Sign In to Kro`. */
  readonly onTapSignIn: () => void
  /** Canon's toolbar `Done`. */
  readonly onTapDone: () => void
}

export function SettingsHubFragment({
  profileSection,
  preferencesSections,
  accountSections,
  syncFooter,
  accountName,
  accountEmail,
  accountInitials,
  onTapSection,
  onTapSignIn,
  onTapDone,
}: SettingsHubFragmentProps) {
  const isSignedIn = accountEmail !== null

  return (
    <div
      data-testid="settings-hub"
      className="flex w-full flex-col gap-kro-large"
    >
      {/*
        The header sits inside the shell's `indigoGrape` slab, so its two pieces
        take `headerDate` rather than `fore`/`accent`: that is the role the
        contrast suite asserts against **both** gradient stops in **both**
        schemes, and it is the only text colour in the system with that
        guarantee. `accent` here would be the Done button reading as a smudge on
        the purple, which is exactly what it did before this note existed.
      */}
      <header className="flex items-center justify-between gap-kro-small">
        <h2
          className="m-0 text-xl font-semibold"
          style={{ color: colorVar('headerDate') }}
        >
          Settings
        </h2>
        <button
          type="button"
          onClick={onTapDone}
          className={cn(
            'inline-flex h-9 items-center rounded-kro-small px-3 text-[15px] font-semibold',
            'outline-none focus-visible:shadow-[var(--kro-ring)]',
          )}
          style={{ color: colorVar('headerDate') }}
        >
          Done
        </button>
      </header>

      {/* Canon's first Section: the profile row, alone and unlabelled. */}
      <SurfaceCard padding={null}>
        <button
          type="button"
          data-testid="hub-profile-row"
          onClick={() =>
            isSignedIn ? onTapSection(profileSection.id) : onTapSignIn()
          }
          className={cn(
            'flex w-full items-center gap-kro-small px-kro-medium py-3 text-left',
            'outline-none focus-visible:shadow-[var(--kro-ring)]',
          )}
        >
          <Avatar initials={accountInitials} isSignedIn={isSignedIn} />
          <span className="flex min-w-0 flex-1 flex-col">
            <span
              className="truncate text-[15px] font-semibold"
              style={{ color: colorVar('fore') }}
            >
              {isSignedIn ? (accountName ?? 'Kro User') : 'Sign In to Kro'}
            </span>
            <span
              className="truncate text-[13px]"
              style={{ color: colorVar('foreSecondary') }}
            >
              {isSignedIn ? accountEmail : 'Sync your data across devices'}
            </span>
          </span>
          <Chevron />
        </button>
      </SurfaceCard>

      <HubGroup
        title="Preferences"
        sections={preferencesSections}
        onTapSection={onTapSection}
      />

      <HubGroup
        title={null}
        sections={accountSections}
        onTapSection={onTapSection}
      />

      {syncFooter === null ? null : (
        <p
          data-testid="sync-footer"
          data-warning={syncFooter.isWarning}
          role="status"
          className="m-0 flex items-center justify-center gap-kro-tiny text-[13px]"
          style={{
            color: syncFooter.isWarning
              ? colorVar('badgeOrange')
              : colorVar('foreSecondary'),
          }}
        >
          <FooterGlyph glyph={syncFooter.glyph} />
          {syncFooter.title}
        </p>
      )}
    </div>
  )
}

function FooterGlyph({ glyph }: { readonly glyph: string }) {
  const Icon = settingsIcon(glyph)
  return <Icon size={14} strokeWidth={2} aria-hidden />
}

function HubGroup({
  title,
  sections,
  onTapSection,
}: {
  readonly title: string | null
  readonly sections: readonly SettingsSection[]
  readonly onTapSection: (id: SettingsSectionId) => void
}) {
  if (sections.length === 0) return null

  return (
    <section className="flex w-full flex-col gap-kro-small">
      {title === null ? null : (
        <h3
          className="m-0 px-kro-tiny text-[13px] font-semibold uppercase tracking-wide"
          style={{ color: colorVar('foreSecondary') }}
        >
          {title}
        </h3>
      )}
      <SurfaceCard padding={null}>
        <div className="flex w-full flex-col">
          {sections.map((section, index) => (
            <HubRow
              key={section.id}
              section={section}
              isFirst={index === 0}
              onTap={() => onTapSection(section.id)}
            />
          ))}
        </div>
      </SurfaceCard>
    </section>
  )
}

function HubRow({
  section,
  isFirst,
  onTap,
}: {
  readonly section: SettingsSection
  readonly isFirst: boolean
  readonly onTap: () => void
}) {
  const Icon = settingsIcon(section.glyph)

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
      <button
        type="button"
        data-testid="hub-row"
        data-section={section.id}
        onClick={onTap}
        className={cn(
          'flex w-full items-center gap-kro-small px-kro-medium py-2.5 text-left',
          'outline-none focus-visible:shadow-[var(--kro-ring)]',
        )}
      >
        <Icon
          size={18}
          strokeWidth={2}
          aria-hidden
          className="shrink-0"
          style={{ color: colorVar('foreSecondary') }}
        />
        <span
          className="min-w-0 flex-1 truncate text-[15px]"
          style={{ color: colorVar('fore') }}
        >
          {section.title}
        </span>
        <Chevron />
      </button>
    </>
  )
}

function Chevron() {
  const Icon = settingsIcon('chevron.right')
  return (
    <Icon
      size={16}
      strokeWidth={2.5}
      aria-hidden
      className="shrink-0"
      style={{ color: colorVar('foreSecondary') }}
    />
  )
}

/**
 * Canon's `initialsAvatar` — the indigo→grape gradient disc.
 *
 * Signed out it is the neutral person glyph canon draws instead, because there
 * are no initials to show and `?` would read as an error.
 */
export function Avatar({
  initials,
  isSignedIn,
  size = 40,
}: {
  readonly initials: string
  readonly isSignedIn: boolean
  readonly size?: number
}) {
  if (!isSignedIn) {
    const Icon = settingsIcon('person.crop.circle')
    return (
      <span
        data-testid="avatar-signed-out"
        className="flex shrink-0 items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          backgroundColor: colorVar('backInner'),
          color: colorVar('foreSecondary'),
        }}
      >
        <Icon size={Math.round(size * 0.55)} strokeWidth={2} aria-hidden />
      </span>
    )
  }

  return (
    <span
      data-testid="avatar-initials"
      className="flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        color: colorVar('onAccent'),
        backgroundImage: `linear-gradient(135deg, ${colorVar('headerGradientIndigo')}, ${colorVar('headerGradientGrape')})`,
      }}
    >
      {initials.length === 0 ? '?' : initials}
    </span>
  )
}
