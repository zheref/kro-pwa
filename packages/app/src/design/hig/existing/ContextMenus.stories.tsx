import { Archive, Pencil, Trash2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../system/primitives/dropdown-menu'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

/**
 * A right-click / long-press analog. The trigger is a list-like row, not a
 * labelled button. Menus stay closed — a defaultOpen popper hangs jsdom
 * snapshots (see `radixEnvironment.tsx`).
 */

export default {
  title: 'HIG/Actions/Context menus',
  component: DropdownMenu,
}

function EndeavorRow({
  title,
  density = 'compact',
}: {
  readonly title: string
  readonly density?: 'compact' | 'comfortable'
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        minHeight: density === 'compact' ? 24 : 36,
        width: 320,
        padding: '0 var(--kro-space-small)',
        fontSize: density === 'compact' ? 12 : 14,
        borderRadius: 'var(--kro-radius-field)',
        background: 'var(--kro-color-back-inner)',
        color: 'var(--kro-color-fore)',
        textAlign: 'left',
        cursor: 'default',
      }}
    >
      {title}
    </div>
  )
}

const OnARow = {
  name: 'On a row · long-press analog',
  render: () => (
    <HigStage>
      <HigRow label="Write the KroTokens port">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" style={{ all: 'unset' }}>
              <EndeavorRow title="Write the KroTokens port" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Archive /> Archive
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem destructive>
              <Trash2 /> Delete endeavor
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </HigRow>
    </HigStage>
  ),
}

const AnotherRow = {
  name: 'Another row · Book the flight',
  render: () => (
    <HigStage>
      <HigRow label="Book the flight">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" style={{ all: 'unset' }}>
              <EndeavorRow title="Book the flight" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem destructive>
              <Trash2 /> Delete endeavor
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the row still reads',
  render: () => (
    <HigBothSchemes>
      <HigRow label="Reply to Ana">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" style={{ all: 'unset' }}>
              <EndeavorRow title="Reply to Ana" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <Pencil /> Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" style={{ all: 'unset' }}>
              <EndeavorRow title="Reply to Ana" density={density} />
            </button>
          </DropdownMenuTrigger>
        </DropdownMenu>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {OnARow.render()}
      {AnotherRow.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
