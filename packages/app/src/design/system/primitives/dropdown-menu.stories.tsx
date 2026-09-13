import { Archive, Pencil, Repeat, Trash2 } from 'lucide-react'
import { Button } from './button'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'

export default {
  title: 'Surfaces/Menu',
  component: DropdownMenuContent,
  parameters: { layout: 'centered' },
}

const Default = {
  render: () => (
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
  ),
}

const WithDestructive = {
  name: 'With a destructive action · named, not just red',
  render: () => (
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
  ),
}

const WithCheckboxes = {
  name: 'Checkbox items · the visibility filter',
  render: () => (
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
        <DropdownMenuCheckboxItem checked>Reminders</DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

const WithDisabled = {
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="secondary">Actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem>
          <Pencil /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem disabled>
          <Repeat /> Repeat weekly
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}

const DarkScheme = {
  render: () => (
    <div
      data-theme="dark"
      style={{ padding: 40, background: 'var(--kro-color-back)' }}
    >
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
    </div>
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Default.render()}
      {WithDestructive.render()}
      {WithCheckboxes.render()}
      {WithDisabled.render()}
      {DarkScheme.render()}
    </StoryGallery>
  ),
}
