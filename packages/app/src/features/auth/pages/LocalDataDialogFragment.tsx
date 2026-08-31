'use client'

/**
 * The existing-local-data dialog — canon's `migrationAlert` (`RC-15`: passive;
 * every intent is a callback prop).
 *
 * Canon presents three buttons in one `alert`: *Sign All Endeavors to My
 * Account*, *Clear Everything and Start Over* (destructive role) and *Cancel*.
 * KC-IS-#31 already owns the title, the interpolated message and what each arm
 * does (`LocalDataDialog.ts`); this only presents them, on the design system's
 * dialog kit.
 *
 * `hideClose` and the two `onInteractOutside`-style guards are deliberate:
 * canon's alert has no dismiss affordance beyond its own three buttons, and a
 * stray tap on the scrim landing on "Cancel" — which pulls from the cloud with
 * the local rows left unowned — is a decision the user did not make. Escape
 * still closes, because a modal that traps the keyboard is worse; it routes to
 * the same arm canon routes swipe-to-dismiss to.
 */
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../../design/system/primitives/dialog'
import { colorVar } from '../../../design/system/tokens/roles'
import { cn } from '../../../design/system/utils/cn'
import {
  LOCAL_DATA_DIALOG_TITLE,
  type LocalDataChoice,
  localDataDialogMessage,
} from '../LocalDataDialog'

export interface LocalDataDialogFragmentProps {
  readonly isPresented: boolean
  /** The anonymous-row count canon interpolates into the message. */
  readonly anonymousCount: number
  /** A choice is being applied — every button waits rather than double-firing. */
  readonly isResolving: boolean
  readonly onChoose: (choice: LocalDataChoice) => void
  /** Escape, and any other dismissal canon treats as Cancel. */
  readonly onDismiss: () => void
}

export function LocalDataDialogFragment({
  isPresented,
  anonymousCount,
  isResolving,
  onChoose,
  onDismiss,
}: LocalDataDialogFragmentProps) {
  return (
    <Dialog
      open={isPresented}
      onOpenChange={(next) => {
        if (!next) onDismiss()
      }}
    >
      <DialogContent
        hideClose
        data-testid="local-data-dialog"
        // `.kro-glass` sets `position: relative` from an unlayered stylesheet
        // and beats the kit's `fixed` utility, so every glass dialog computes
        // to `relative` and lands after the shell in normal flow. The inline
        // style is the one declaration that outranks it. The fix belongs in
        // `design/system/` — outside this issue's lane; named in the PR body.
        style={{ position: 'fixed' }}
        className="top-[8dvh] max-h-[84dvh] max-w-[420px] translate-y-0 overflow-y-auto"
        onInteractOutside={(event) => event.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle style={{ color: colorVar('fore') }}>
            {LOCAL_DATA_DIALOG_TITLE}
          </DialogTitle>
          <DialogDescription style={{ color: colorVar('foreSecondary') }}>
            {localDataDialogMessage(anonymousCount)}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-kro-small">
          <ChoiceButton
            testId="local-data-sign-all"
            title="Sign All Endeavors to My Account"
            tone="primary"
            isDisabled={isResolving}
            onClick={() => onChoose('signAll')}
          />
          <ChoiceButton
            testId="local-data-clear-all"
            title="Clear Everything and Start Over"
            tone="destructive"
            isDisabled={isResolving}
            onClick={() => onChoose('clearAll')}
          />
          <ChoiceButton
            testId="local-data-cancel"
            title="Cancel"
            tone="plain"
            isDisabled={isResolving}
            onClick={() => onChoose('cancel')}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ChoiceButton({
  testId,
  title,
  tone,
  isDisabled,
  onClick,
}: {
  readonly testId: string
  readonly title: string
  readonly tone: 'primary' | 'destructive' | 'plain'
  readonly isDisabled: boolean
  readonly onClick: () => void
}) {
  const color =
    tone === 'destructive'
      ? colorVar('kroRed')
      : tone === 'primary'
        ? colorVar('onAccent')
        : colorVar('fore')

  return (
    <button
      type="button"
      data-testid={testId}
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        'flex h-11 w-full items-center justify-center rounded-kro-field border px-3',
        'text-[15px] font-semibold outline-none focus-visible:shadow-[var(--kro-ring)]',
        'disabled:cursor-not-allowed',
      )}
      style={{
        backgroundColor:
          tone === 'primary' ? colorVar('accent') : colorVar('backInner'),
        borderColor: colorVar('hairline'),
        color,
        opacity: isDisabled ? 0.62 : undefined,
      }}
    >
      {title}
    </button>
  )
}
