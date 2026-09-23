import { Archive, Pencil, Repeat, Trash2 } from 'lucide-react'
import { StoryGallery } from '../../storybook/storyGallery'
import { cn } from '../../system/utils/cn'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'
import { MENU_CLASSES, Menu, MenuItem, MenuLabel, MenuSeparator } from './Menu'

/**
 * The command list a popover (or a sheet, on a narrow surface) holds.
 * Hover matches the sidebar: a translucent fill, type color unchanged.
 */
export default {
  title: 'Navigation/Menu list',
  component: Menu,
}

function Commands({
  density,
}: {
  readonly density?: 'compact' | 'comfortable'
}) {
  return (
    <div
      className={cn(
        'kro-glass w-[280px] overflow-hidden rounded-kro-surface',
        density === 'comfortable'
          ? MENU_CLASSES.frameComfortable
          : MENU_CLASSES.frame,
      )}
    >
      <Menu density={density} label="Endeavor">
        <MenuLabel>Endeavor</MenuLabel>
        <MenuItem>
          <Pencil /> Edit
        </MenuItem>
        <MenuItem>
          <Repeat /> Repeat weekly
        </MenuItem>
        <MenuItem>
          <Archive /> Archive
        </MenuItem>
        <MenuSeparator />
        <MenuItem destructive>
          <Trash2 /> Delete endeavor
        </MenuItem>
      </Menu>
    </div>
  )
}

const Default = {
  name: 'Commands · compact, even inset',
  render: () => (
    <HigStage gradient>
      <HigRow label="Hover a row">
        <Commands />
      </HigRow>
    </HigStage>
  ),
}

const WithDisabled = {
  name: 'A disabled row fades once',
  render: () => (
    <HigStage gradient>
      <HigRow label="Repeat is unavailable">
        <div
          className={cn(
            'kro-glass w-[280px] overflow-hidden rounded-kro-surface',
            MENU_CLASSES.frame,
          )}
        >
          <Menu label="Endeavor">
            <MenuItem>
              <Pencil /> Edit
            </MenuItem>
            <MenuItem disabled>
              <Repeat /> Repeat weekly
            </MenuItem>
          </Menu>
        </div>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the fill stays the opposite pole',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="Compact menu">
        <Commands />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities render={(density) => <Commands density={density} />} />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Default.render()}
      {WithDisabled.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
