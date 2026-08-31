import { Button } from './button'
import { POPOVER_SIZE, Popover, PopoverContent, PopoverTrigger } from './popover'

/**
 * The desktop idiom. Each story is sized from `POPOVER_SIZE`, which carries
 * KroApple's canonical macOS dimensions — so the panels here are the panels
 * the shell child will render, not approximations of them.
 */
export default {
  title: 'Design system/Primitives/Popover',
  component: PopoverContent,
  parameters: { layout: 'centered' },
}

function Rows({ count }: { count: number }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={`row-${index}`}
          style={{
            padding: 'var(--kro-space-small)',
            borderRadius: 'var(--kro-radius-small)',
            background: 'var(--kro-color-back-inner)',
            color: 'var(--kro-color-fore)',
            fontSize: 14,
          }}
        >
          Item {index + 1}
        </div>
      ))}
    </div>
  )
}

export const Inbox = {
  name: `Inbox · ${POPOVER_SIZE.inbox.width}×${POPOVER_SIZE.inbox.height}`,
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button variant="secondary">Inbox</Button>
      </PopoverTrigger>
      <PopoverContent
        style={{ width: POPOVER_SIZE.inbox.width, height: POPOVER_SIZE.inbox.height }}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--kro-color-fore)' }}>
          Inbox
        </h3>
        <Rows count={8} />
      </PopoverContent>
    </Popover>
  ),
}

export const Visibility = {
  name: `Visibility · ${POPOVER_SIZE.visibility.width}×${POPOVER_SIZE.visibility.height}`,
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button variant="secondary">Visibility</Button>
      </PopoverTrigger>
      <PopoverContent
        style={{
          width: POPOVER_SIZE.visibility.width,
          height: POPOVER_SIZE.visibility.height,
        }}
      >
        <h3 style={{ margin: '0 0 12px', fontSize: 15, color: 'var(--kro-color-fore)' }}>
          What shows in My Day
        </h3>
        <Rows count={5} />
      </PopoverContent>
    </Popover>
  ),
}

export const Profile = {
  name: `Profile · width ${POPOVER_SIZE.profile.width}`,
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button variant="ghost">Profile</Button>
      </PopoverTrigger>
      <PopoverContent style={{ width: POPOVER_SIZE.profile.width }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--kro-color-fore)' }}>
          Signed in as zheref
        </p>
        <p
          style={{
            margin: '4px 0 0',
            fontSize: 13,
            color: 'var(--kro-color-fore-secondary)',
          }}
        >
          Syncing to Kro Cloud
        </p>
      </PopoverContent>
    </Popover>
  ),
}

export const DarkScheme = {
  render: () => (
    <div data-theme="dark" style={{ padding: 40, background: 'var(--kro-color-back)' }}>
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button variant="secondary">Visibility</Button>
        </PopoverTrigger>
        <PopoverContent style={{ width: POPOVER_SIZE.visibility.width }}>
          <Rows count={4} />
        </PopoverContent>
      </Popover>
    </div>
  ),
}
