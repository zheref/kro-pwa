import type { ReactNode } from 'react'
import { Button } from './button'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from './sheet'

/**
 * The mobile idiom. Set the viewport to a phone size to judge these — a bottom
 * sheet at desktop width is a shape nobody will ever see.
 */
export default {
  title: 'Design system/Primitives/Sheet',
  component: SheetContent,
  parameters: { layout: 'fullscreen' },
}

function Stage({
  theme,
  children,
}: {
  readonly theme?: 'light' | 'dark'
  readonly children: ReactNode
}) {
  return (
    <div
      data-theme={theme}
      style={{
        padding: 24,
        background: 'var(--kro-color-back)',
      }}
    >
      {children}
    </div>
  )
}

function Items() {
  return (
    <div style={{ display: 'grid', gap: 8 }}>
      {['Reply to Ana', 'Book the flight', 'Read the RC handbook'].map(
        (title) => (
          <div
            key={title}
            style={{
              padding: 'var(--kro-space-medium)',
              borderRadius: 'var(--kro-radius-field)',
              background: 'var(--kro-color-back-inner)',
              color: 'var(--kro-color-fore)',
            }}
          >
            {title}
          </div>
        ),
      )}
    </div>
  )
}

const Bottom = {
  name: 'Bottom · the default, where a thumb reaches',
  render: () => (
    <Stage>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="primary">Open inbox</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle>Inbox</SheetTitle>
          <SheetDescription>Three items to triage.</SheetDescription>
          <Items />
        </SheetContent>
      </Sheet>
    </Stage>
  ),
}

const Right = {
  name: 'Right · the desktop drawer',
  render: () => (
    <Stage>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="secondary">Visibility</Button>
        </SheetTrigger>
        <SheetContent side="right">
          <SheetTitle>Visibility</SheetTitle>
          <SheetDescription>What shows in My Day.</SheetDescription>
          <Items />
        </SheetContent>
      </Sheet>
    </Stage>
  ),
}

const Top = {
  render: () => (
    <Stage>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="secondary">Capture</Button>
        </SheetTrigger>
        <SheetContent side="top">
          <SheetTitle>Capture</SheetTitle>
          <SheetDescription>Jot it down and route it later.</SheetDescription>
        </SheetContent>
      </Sheet>
    </Stage>
  ),
}

const DarkScheme = {
  render: () => (
    <Stage theme="dark">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="primary">Open inbox</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle>Inbox</SheetTitle>
          <SheetDescription>Three items to triage.</SheetDescription>
          <Items />
        </SheetContent>
      </Sheet>
    </Stage>
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Bottom.render()}
      {Right.render()}
      {Top.render()}
      {DarkScheme.render()}
    </StoryGallery>
  ),
}
