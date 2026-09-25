/**
 * Endeavor Detail's chrome inside the shell's trailing pane (`RC-15`) — the
 * pane twin of the dialog's `CompactPresentationHeader` row.
 *
 * Values and callbacks in, no dispatch: the overlay Page only chooses between
 * this and the dialog/sheet chrome. The read surface uses the pane's own
 * header (title + close), so this adds nothing to it. An editor is a
 * drill-in: its Back takes the header's leading seat, its title the centre,
 * its Save the trailing seat, and the body slides with the shared drill-in
 * motion.
 */
import type { ReactNode } from 'react'
import { DrillTransition } from '../../../design/chrome/panel/DrillTransition'
import {
  PANEL_TOOLBAR_BUTTON_SIZE,
  PANEL_TOOLBAR_GLYPH,
  PanelToolbarButton,
} from '../../../design/chrome/panel/TrailingDetailPanel'
import { endeavorIcon } from '../../../design/endeavor/endeavorIcons'
import { colorVar } from '../../../design/system/tokens/roles'
import { ToolbarSlot } from '../../main/ToolbarSlots'

export interface DetailSaveButtonProps {
  readonly isEnabled: boolean
  readonly isSaving: boolean
  /**
   * `touch` is the dialog's full-height control; `toolbar` fits the pane's
   * header, where nothing may be taller than its 36px toolbar buttons.
   */
  readonly size: 'touch' | 'toolbar'
  readonly onPress: () => void
}

/** The one Save both hosts render — the dialog's row and the pane's header. */
export function DetailSaveButton({
  isEnabled,
  isSaving,
  size,
  onPress,
}: DetailSaveButtonProps) {
  return (
    <button
      type="button"
      disabled={!isEnabled}
      onClick={onPress}
      className={`shrink-0 rounded-kro-pill ${
        size === 'toolbar' ? 'px-3' : 'px-4'
      } text-sm font-semibold outline-none focus-visible:shadow-[var(--kro-ring)] disabled:opacity-[var(--kro-opacity-disabled)]`}
      style={{
        ...(size === 'toolbar'
          ? { height: PANEL_TOOLBAR_BUTTON_SIZE }
          : { minHeight: 'var(--kro-size-min-touch-target)' }),
        backgroundColor: colorVar('accent'),
        color: colorVar('onAccent'),
      }}
    >
      {isSaving ? 'Saving…' : 'Save'}
    </button>
  )
}

export interface DetailPaneChromeFragmentProps {
  /** An editor (Edit, Duration, a relation) is drilled in over the read surface. */
  readonly isEditor: boolean
  /** The editor's title, shown in the pane header's centre seat. */
  readonly title: string
  /** Edit and Duration have a Save; relations commit per row. */
  readonly showsSave: boolean
  readonly isSaveEnabled: boolean
  readonly isSaving: boolean
  /** A key per Detail screen, so each drill-in remounts and slides. */
  readonly screenKey: string
  readonly onBack: () => void
  readonly onSave: () => void
  readonly children: ReactNode
}

export function DetailPaneChromeFragment({
  isEditor,
  title,
  showsSave,
  isSaveEnabled,
  isSaving,
  screenKey,
  onBack,
  onSave,
  children,
}: DetailPaneChromeFragmentProps) {
  return (
    <>
      {isEditor ? (
        <>
          <ToolbarSlot placement="detailPaneLeading">
            <PanelToolbarButton label="Back" onPress={onBack}>
              <BackGlyph {...PANEL_TOOLBAR_GLYPH} />
            </PanelToolbarButton>
          </ToolbarSlot>
          <ToolbarSlot placement="detailPaneTitle">
            <p
              data-testid="detail-pane-editor-title"
              className="m-0 truncate text-base font-semibold"
              style={{ color: colorVar('fore') }}
            >
              {title}
            </p>
          </ToolbarSlot>
          {showsSave ? (
            <ToolbarSlot placement="detailPaneTrailing">
              <DetailSaveButton
                size="toolbar"
                isEnabled={isSaveEnabled}
                isSaving={isSaving}
                onPress={onSave}
              />
            </ToolbarSlot>
          ) : null}
        </>
      ) : null}
      <ToolbarSlot placement="detailPane">
        <DrillTransition
          depth={isEditor ? 1 : 0}
          screenKey={screenKey}
          testId="detail-pane-plan"
          className="flex flex-col gap-kro-small px-kro-small pb-kro-medium"
        >
          {children}
        </DrillTransition>
      </ToolbarSlot>
    </>
  )
}

const BackGlyph = endeavorIcon('chevron.left')
