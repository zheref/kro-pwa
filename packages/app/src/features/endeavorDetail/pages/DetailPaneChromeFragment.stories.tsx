/**
 * Endeavor Detail's pane chrome — visual evidence (`RC-11`, `UZF-26`).
 *
 * The read surface (the pane header is the shell's own, so the fragment adds
 * only the body), an editor with a Save waiting on a change, and a relation
 * editor, which commits per row and so has no Save. A bare outlet frame stands
 * in for the shell's panel: the fragment needs no store at all.
 */
import type { ReactNode } from 'react'
import { Stage } from '../../../design/endeavor/storyStage'
import { ToolbarOutlet, ToolbarSlotsProvider } from '../../main/ToolbarSlots'
import { DetailPaneChromeFragment } from './DetailPaneChromeFragment'

const noop = () => {}

/** The four pane outlets the fragment portals into, laid out as the header. */
export function DetailPaneChromeFrame({
  children,
}: {
  readonly children: ReactNode
}) {
  return (
    <ToolbarSlotsProvider>
      <div className="flex items-center gap-kro-small p-kro-small">
        <ToolbarOutlet placement="detailPaneLeading" className="flex" />
        <ToolbarOutlet placement="detailPaneTitle" className="flex-1" />
        <ToolbarOutlet placement="detailPaneTrailing" className="flex" />
      </div>
      <ToolbarOutlet placement="detailPane" className="flex flex-col" />
      {children}
    </ToolbarSlotsProvider>
  )
}

export const detailPaneChromeScenes = {
  readSurface: {
    isEditor: false,
    title: 'Write the quarterly review',
    showsSave: false,
    isSaveEnabled: false,
    isSaving: false,
    screenKey: 'detail',
  },
  editorDirty: {
    isEditor: true,
    title: 'Edit Task',
    showsSave: true,
    isSaveEnabled: true,
    isSaving: false,
    screenKey: 'edit',
  },
  relationEditor: {
    isEditor: true,
    title: 'Performances',
    showsSave: false,
    isSaveEnabled: false,
    isSaving: false,
    screenKey: 'relation:performances',
  },
  saving: {
    isEditor: true,
    title: 'Duration',
    showsSave: true,
    isSaveEnabled: false,
    isSaving: true,
    screenKey: 'duration',
  },
} as const

const scene = (key: keyof typeof detailPaneChromeScenes) => ({
  render: () => (
    <Stage width={430}>
      <DetailPaneChromeFrame>
        <DetailPaneChromeFragment
          {...detailPaneChromeScenes[key]}
          onBack={noop}
          onSave={noop}
        >
          <p>Body of {detailPaneChromeScenes[key].screenKey}</p>
        </DetailPaneChromeFragment>
      </DetailPaneChromeFrame>
    </Stage>
  ),
})

export default {
  title: 'Endeavor Detail/Pane Chrome',
  component: DetailPaneChromeFragment,
  parameters: { layout: 'fullscreen' },
}

/** The read surface — only the body; the pane's own header titles it. */
export const ReadSurface = scene('readSurface')

/** Edit with a change made — Back leading, the title centred, Save enabled. */
export const EditorDirty = scene('editorDirty')

/** A relation editor — each row commits on its own, so there is no Save. */
export const RelationEditor = scene('relationEditor')

/** Duration mid-save — Save reads "Saving…" and is disabled. */
export const Saving = scene('saving')
