import { Archive, Pencil, Repeat, Trash2 } from 'lucide-react'
import { Button, buttonSizeForDensity } from '../../system/primitives/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
 * Menus stay closed. Opening a Radix popper under jsdom (story snapshots)
 * stalls the Vitest worker — see `radixEnvironment.tsx`. The trigger is
 * the thing this gallery can safely mount.
 */

export default {
  title: 'HIG/Actions/Menus',
  component: DropdownMenu,
}

const Actions = {
  name: 'Actions · closed trigger',
  render: () => (
    <HigStage>
      <HigRow label="Endeavor actions">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Endeavor</DropdownMenuLabel>
            <DropdownMenuItem>
              <Pencil /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Repeat /> Repeat weekly
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Archive /> Archive
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </HigRow>
    </HigStage>
  ),
}

const Destructive = {
  name: 'Destructive · named, not just red',
  render: () => (
    <HigStage>
      <HigRow label="Delete is a word">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>
              <Pencil /> Edit
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

const Visibility = {
  name: 'Checkbox items · what shows in My Day',
  render: () => (
    <HigStage>
      <HigRow label="Visibility">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">Visibility</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Show in My Day</DropdownMenuLabel>
            <DropdownMenuCheckboxItem checked>
              Completed today
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked={false}>
              Expired
            </DropdownMenuCheckboxItem>
            <DropdownMenuCheckboxItem checked>
              Reminders
            </DropdownMenuCheckboxItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the trigger still reads',
  render: () => (
    <HigBothSchemes>
      <HigRow label="Actions">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">Actions</Button>
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
            <Button size={buttonSizeForDensity(density)} variant="secondary">
              Actions
            </Button>
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
      {Actions.render()}
      {Destructive.render()}
      {Visibility.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
