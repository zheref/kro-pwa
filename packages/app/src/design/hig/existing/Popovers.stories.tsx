import type { ReactNode } from 'react'
import { Button, buttonSizeForDensity } from '../../system/primitives/button'
import {
  POPOVER_SIZE,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../../system/primitives/popover'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

/**
 * Closed triggers. A defaultOpen popper hangs jsdom story snapshots —
 * see `radixEnvironment.tsx`. The gallery shows the trigger and a static
 * preview of the same panel so the size contract is still visible.
 */

export default {
  title: 'HIG/Presentation/Popovers',
  component: Popover,
}

function Rows({ count }: { readonly count: number }) {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {Array.from({ length: count }, (_, index) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: filler rows generated from a fixed count
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

function Preview({
  title,
  width,
  height,
  children,
}: {
  readonly title: string
  readonly width: number
  readonly height?: number
  readonly children: ReactNode
}) {
  return (
    <div
      className="kro-glass rounded-kro-surface p-kro-medium"
      style={{
        width,
        height,
        overflow: 'auto',
      }}
    >
      <h3
        style={{
          margin: '0 0 12px',
          fontSize: 15,
          color: 'var(--kro-color-fore)',
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  )
}

const Inbox = {
  name: `Inbox · ${POPOVER_SIZE.inbox.width}×${POPOVER_SIZE.inbox.height}`,
  render: () => (
    <HigStage>
      <HigRow label="Closed trigger">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary">Inbox</Button>
          </PopoverTrigger>
          <PopoverContent
            style={{
              width: POPOVER_SIZE.inbox.width,
              height: POPOVER_SIZE.inbox.height,
            }}
          >
            <Rows count={8} />
          </PopoverContent>
        </Popover>
      </HigRow>
      <HigRow label="The panel, at the canonical size">
        <Preview title="Inbox" width={POPOVER_SIZE.inbox.width} height={280}>
          <Rows count={4} />
        </Preview>
      </HigRow>
    </HigStage>
  ),
}

const Visibility = {
  name: `Visibility · ${POPOVER_SIZE.visibility.width}×${POPOVER_SIZE.visibility.height}`,
  render: () => (
    <HigStage>
      <HigRow label="Closed trigger">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="secondary">Visibility</Button>
          </PopoverTrigger>
          <PopoverContent
            style={{
              width: POPOVER_SIZE.visibility.width,
              height: POPOVER_SIZE.visibility.height,
            }}
          >
            <Rows count={5} />
          </PopoverContent>
        </Popover>
      </HigRow>
      <HigRow label="What shows in My Day">
        <Preview
          title="What shows in My Day"
          width={POPOVER_SIZE.visibility.width}
        >
          <Rows count={5} />
        </Preview>
      </HigRow>
    </HigStage>
  ),
}

const Profile = {
  name: `Profile · width ${POPOVER_SIZE.profile.width}`,
  render: () => (
    <HigBothSchemes>
      <HigRow label="Signed in">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost">Profile</Button>
          </PopoverTrigger>
          <PopoverContent style={{ width: POPOVER_SIZE.profile.width }}>
            <p
              style={{
                margin: 0,
                fontSize: 14,
                color: 'var(--kro-color-fore)',
              }}
            >
              Signed in as zheref
            </p>
          </PopoverContent>
        </Popover>
        <Preview title="Profile" width={POPOVER_SIZE.profile.width}>
          <p
            style={{ margin: 0, fontSize: 14, color: 'var(--kro-color-fore)' }}
          >
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
        </Preview>
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <Popover>
          <PopoverTrigger asChild>
            <Button size={buttonSizeForDensity(density)} variant="secondary">
              Inbox
            </Button>
          </PopoverTrigger>
        </Popover>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Inbox.render()}
      {Visibility.render()}
      {Profile.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
