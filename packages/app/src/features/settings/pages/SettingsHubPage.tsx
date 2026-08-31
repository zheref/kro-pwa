'use client'

/**
 * The Settings surface's stateful container (`RC-37`; implements `UZF-4`).
 *
 * The `/adjust` destination's body: the hub, or one drill-down pane. It is the
 * only artifact in this feature that calls both `useAppSelector` and
 * `useAppDispatch`, and it owns no markup of its own beyond the frame and the
 * one Fragment call per pane.
 *
 * ## The two sync triggers, and which one is the acceptance criterion
 *
 * KC-IS-#31 declares four `SettingsSyncTrigger`s and the rules over them.
 * Two are this surface's:
 *
 * - **`settingsOpened`** fires on mount. It resolves `skipped` by design —
 *   canon is emphatic that opening Settings does **not** pull, *"so a change
 *   made while offline isn't overwritten just because the user reopened
 *   Settings"* — and firing it anyway is what keeps that rule exercised rather
 *   than merely written down.
 * - **`settingsClosed`** fires when the surface goes away. That is the push
 *   canon describes: *"On closing Settings, it sends the current synced values
 *   back to the account."*
 *
 * "Closing" is unmount, not the Done button, and deliberately: leaving
 * `/adjust` through the sidebar, the tab bar, the browser's back button or Done
 * are all the same event to the user, and hanging the push off one of them
 * would drop the other three.
 *
 * ## The desktop frame
 *
 * Canon presents the hub as a sheet with `.frame(minWidth: 760, minHeight:
 * 620)` on the Mac and full-bleed on the phone. `presentationFor(...)` is the
 * ported decision table, so the frame comes from the same cell the rest of the
 * shell reads rather than from a media query written here.
 */
import type { SettingValue } from '@kro/core'
import { useCallback, useEffect } from 'react'
import { syncSettingsThunk } from '../../auth/AuthProducer'
import { SettingsSyncTrigger } from '../../auth/CloudSettings'
import { signOutThunk } from '../../auth/AuthProducer'
import { selectCurrentUser, selectUserInitials } from '../../auth/AuthSelectors'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import { onDestinationRouteMounted } from '../../main/MainFeature'
import {
  PresentationSurface,
  presentationFor,
  presentationStyle,
} from '../../main/MainPresentation'
import { navigateToDestinationThunk } from '../../main/MainProducer'
import { selectSurface } from '../../main/MainSelectors'
import { DestinationKind } from '../../main/SidebarDestination'
import {
  userDidTapBackToHub,
  userDidTapSection,
  userDidTapSignIn,
} from '../SettingsFeature'
import {
  connectGoogleThunk,
  disconnectGoogleThunk,
  loadGoogleConnectionThunk,
  loadSettingsThunk,
  updateSettingThunk,
} from '../SettingsProducer'
import {
  accountHubSections,
  preferencesHubSections,
  profileHubSection,
  selectIntegrationRows,
  selectIsSettingsEditable,
  selectOpenSection,
  selectSettingValues,
  selectSettingsErrorCopy,
  selectSettingsSyncFooter,
  selectWorkingHoursValid,
} from '../SettingsSelectors'
import {
  SettingsPaneKind,
  type SettingsSectionId,
  settingsPaneKind,
  settingsSectionForId,
  settingsSectionTitle,
} from '../SettingsSection'
import { AccountSectionFragment } from './AccountSectionFragment'
import { IntegrationsSectionFragment } from './IntegrationsSectionFragment'
import { PreferencesSectionFragment } from './PreferencesSectionFragment'
import { SettingsHubFragment } from './SettingsHubFragment'
import { settingsIcon } from './settingsIcons'

export function SettingsHubPage() {
  const dispatch = useAppDispatch()

  const openSection = useAppSelector(selectOpenSection)
  const values = useAppSelector(selectSettingValues)
  const isEditable = useAppSelector(selectIsSettingsEditable)
  const isWorkingHoursValid = useAppSelector(selectWorkingHoursValid)
  const errorCopy = useAppSelector(selectSettingsErrorCopy)
  const syncFooter = useAppSelector(selectSettingsSyncFooter)
  const integrationRows = useAppSelector(selectIntegrationRows)
  const user = useAppSelector(selectCurrentUser)
  const initials = useAppSelector(selectUserInitials)
  const surface = useAppSelector(selectSurface)

  const presentation = presentationFor(PresentationSurface.settings, surface)

  // Open: tell the shell which destination this is (the job the shared
  // `DestinationPage` did before this Page replaced it — it is what keeps the
  // URL the authority for the sidebar's highlight), read the snapshot, ask the
  // deployment about Google, and fire the trigger canon defines for this
  // moment (which correctly does nothing).
  useEffect(() => {
    dispatch(
      onDestinationRouteMounted({
        destination: { kind: DestinationKind.settings },
      }),
    )
    const load = dispatch(loadSettingsThunk())
    const google = dispatch(loadGoogleConnectionThunk())
    void dispatch(
      syncSettingsThunk({
        trigger: SettingsSyncTrigger.settingsOpened,
        now: new Date(),
      }),
    )
    return () => {
      load.abort()
      google.abort()
    }
  }, [dispatch])

  // Close: the push. Separate from the load effect so a re-run of one can never
  // fire the other, and so the cleanup reads as what it is.
  useEffect(
    () => () => {
      void dispatch(
        syncSettingsThunk({
          trigger: SettingsSyncTrigger.settingsClosed,
          now: new Date(),
        }),
      )
    },
    [dispatch],
  )

  const onChangeSetting = useCallback(
    (key: string, value: SettingValue) => {
      void dispatch(updateSettingThunk({ key, value }))
    },
    [dispatch],
  )

  const onTapDone = useCallback(() => {
    void dispatch(
      navigateToDestinationThunk({ destination: { kind: DestinationKind.myDay } }),
    )
  }, [dispatch])

  const section =
    openSection === null ? null : settingsSectionForId(openSection)

  return (
    <div className="flex w-full justify-center p-kro-medium">
      <div
        data-testid="settings-surface"
        data-presentation={presentation.kind}
        className="flex w-full max-w-[760px] flex-col gap-kro-medium"
        style={presentationStyle(presentation)}
      >
        {section === null ? (
          <SettingsHubFragment
            profileSection={profileHubSection}
            preferencesSections={preferencesHubSections}
            accountSections={accountHubSections}
            syncFooter={syncFooter}
            accountName={user?.name ?? null}
            accountEmail={user === null ? null : (user.emails[0] ?? '')}
            accountInitials={initials}
            onTapSection={(id: SettingsSectionId) =>
              dispatch(userDidTapSection(id))
            }
            onTapSignIn={() =>
              dispatch(userDidTapSignIn({ origin: 'settingsHub' }))
            }
            onTapDone={onTapDone}
          />
        ) : (
          <>
            <PaneHeader
              title={settingsSectionTitle(section.id)}
              onTapBack={() => dispatch(userDidTapBackToHub())}
            />

            {/*
              The shell's `indigoGrape` slab is 180px tall and a pane opens
              inside it. The header is legible on it and so is a white card, but
              a *subgroup label* — small, secondary, uppercase — is not: without
              this spacer "WORKING HOURS" landed in the solid part of the
              gradient and disappeared. The hub needs none because its profile
              card already pushes the first label past the fade.
            */}
            <div className="pt-kro-large" />

            {settingsPaneKind(section.id) === SettingsPaneKind.preferences &&
            section.settingGroup !== null ? (
              <PreferencesSectionFragment
                group={section.settingGroup}
                values={values}
                isLoaded={isEditable}
                isWorkingHoursValid={isWorkingHoursValid}
                errorCopy={errorCopy}
                onChangeSetting={onChangeSetting}
              />
            ) : null}

            {settingsPaneKind(section.id) === SettingsPaneKind.integrations ? (
              <IntegrationsSectionFragment
                rows={integrationRows}
                errorCopy={errorCopy}
                onTapConnect={() => {
                  void dispatch(connectGoogleThunk())
                }}
                onTapDisconnect={() => {
                  void dispatch(disconnectGoogleThunk())
                }}
              />
            ) : null}

            {settingsPaneKind(section.id) === SettingsPaneKind.profile ? (
              <AccountSectionFragment
                pane="profile"
                user={user}
                onTapSignIn={() =>
                  dispatch(userDidTapSignIn({ origin: 'settingsHub' }))
                }
                onTapSignOut={() => {
                  void dispatch(signOutThunk())
                }}
              />
            ) : null}

            {settingsPaneKind(section.id) === SettingsPaneKind.subscription ? (
              <AccountSectionFragment
                pane="subscription"
                user={user}
                onTapSignIn={() =>
                  dispatch(userDidTapSignIn({ origin: 'settingsHub' }))
                }
                onTapSignOut={() => {
                  void dispatch(signOutThunk())
                }}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  )
}

/** Canon's pushed-pane navigation bar: a back affordance and the title. */
function PaneHeader({
  title,
  onTapBack,
}: {
  readonly title: string
  readonly onTapBack: () => void
}) {
  const Icon = settingsIcon('chevron.left')

  // Both pieces sit inside the shell's `indigoGrape` slab, so both take
  // `headerDate` — the one text role with a contrast assertion against both
  // gradient stops in both schemes. See `SettingsHubFragment`'s header note.
  return (
    <header className="flex items-center gap-kro-small">
      <button
        type="button"
        data-testid="pane-back"
        aria-label="Back to Settings"
        onClick={onTapBack}
        className={cn(
          'inline-flex h-9 items-center gap-1 rounded-kro-small px-2 text-[15px] font-medium',
          'outline-none focus-visible:shadow-[var(--kro-ring)]',
        )}
        style={{ color: colorVar('headerDate') }}
      >
        <Icon size={16} strokeWidth={2.5} aria-hidden />
        Settings
      </button>
      <h2
        className="m-0 text-lg font-semibold"
        style={{ color: colorVar('headerDate') }}
      >
        {title}
      </h2>
    </header>
  )
}
