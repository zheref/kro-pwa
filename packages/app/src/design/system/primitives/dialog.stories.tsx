import { Button } from './button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './dialog'

export default {
  title: 'Design system/Primitives/Dialog',
  component: DialogContent,
  parameters: { layout: 'centered' },
}

export const Default = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="primary">Triage inbox</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Triage inbox</DialogTitle>
          <DialogDescription>
            Three items are waiting. Each needs a quadrant and a date.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Later</Button>
          </DialogClose>
          <Button variant="primary">Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const NoClose = {
  name: 'No close · a flow that must be completed',
  render: () => (
    <Dialog defaultOpen>
      <DialogContent hideClose>
        <DialogHeader>
          <DialogTitle>Finish setting up Kro</DialogTitle>
          <DialogDescription>
            Choose where your endeavors live before you start. This one has no
            dismissal because leaving it half-done has no meaning.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="primary">Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const Destructive = {
  name: 'Destructive · the action is named, not just red',
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete “Write the KroTokens port”?</DialogTitle>
          <DialogDescription>
            Its three logged sessions and 240 points go with it. This cannot be
            undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Keep it</Button>
          </DialogClose>
          <Button variant="destructive">Delete endeavor</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
}

export const LongContent = {
  name: 'Long content · the panel stays glass',
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Session history</DialogTitle>
          <DialogDescription>
            Everything logged against this endeavor.
          </DialogDescription>
        </DialogHeader>
        <div
          style={{ maxHeight: 320, overflow: 'auto', display: 'grid', gap: 8 }}
        >
          {Array.from({ length: 14 }, (_, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: filler rows generated from a constant length — nothing reorders and there is no id
              key={`session-${index}`}
              style={{
                padding: 'var(--kro-space-small)',
                borderRadius: 'var(--kro-radius-field)',
                background: 'var(--kro-color-back-inner)',
                color: 'var(--kro-color-fore)',
                fontSize: 14,
              }}
            >
              25 minutes · {index + 1} August
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  ),
}
