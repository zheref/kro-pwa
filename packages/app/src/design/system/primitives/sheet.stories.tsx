import { Button } from './button'
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

export const Bottom = {
  name: 'Bottom · the default, where a thumb reaches',
  render: () => (
    <div
      style={{
        height: '100vh',
        padding: 24,
        background: 'var(--kro-color-back)',
      }}
    >
      <Sheet defaultOpen>
        <SheetTrigger asChild>
          <Button variant="primary">Open inbox</Button>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle>Inbox</SheetTitle>
          <SheetDescription>Three items to triage.</SheetDescription>
          <Items />
        </SheetContent>
      </Sheet>
    </div>
  ),
}

export const Right = {
  name: 'Right · the desktop drawer',
  render: () => (
    <div
      style={{
        height: '100vh',
        padding: 24,
        background: 'var(--kro-color-back)',
      }}
    >
      <Sheet defaultOpen>
        <SheetContent side="right">
          <SheetTitle>Visibility</SheetTitle>
          <SheetDescription>What shows in My Day.</SheetDescription>
          <Items />
        </SheetContent>
      </Sheet>
    </div>
  ),
}

export const Top = {
  render: () => (
    <div
      style={{
        height: '100vh',
        padding: 24,
        background: 'var(--kro-color-back)',
      }}
    >
      <Sheet defaultOpen>
        <SheetContent side="top">
          <SheetTitle>Capture</SheetTitle>
          <SheetDescription>Jot it down and route it later.</SheetDescription>
        </SheetContent>
      </Sheet>
    </div>
  ),
}

export const DarkScheme = {
  render: () => (
    <div
      data-theme="dark"
      style={{
        height: '100vh',
        padding: 24,
        background: 'var(--kro-color-back)',
      }}
    >
      <Sheet defaultOpen>
        <SheetContent>
          <SheetTitle>Inbox</SheetTitle>
          <SheetDescription>Three items to triage.</SheetDescription>
          <Items />
        </SheetContent>
      </Sheet>
    </div>
  ),
}
