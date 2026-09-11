import { type ReactNode, useId } from 'react'
import { Label } from '../../hig/layout/Label'
import { DENSITY_TYPE } from '../../system/density'
import { cn } from '../../system/utils/cn'
import { type FluentControlSize, densityForFluentSize } from '../sizes'

/**
 * Field — Fluent 2 Field, painted with KroTokens.
 *
 * A label plus any control, with an optional hint, a required mark and
 * a validation message. Colour is never the only signal: error, warning
 * and success each put the words in the message, then tint them.
 *
 * The control is `children`. This wrapper does not apply a disabled
 * fade — the control already does, once.
 */

export type FieldOrientation = 'vertical' | 'horizontal'
export type FieldValidationState = 'none' | 'error' | 'warning' | 'success'

export interface FieldProps {
  readonly label: string
  readonly hint?: string
  readonly required?: boolean
  readonly validationMessage?: string
  readonly validationState?: FieldValidationState
  readonly orientation?: FieldOrientation
  readonly size?: FluentControlSize
  readonly htmlFor?: string
  readonly children: ReactNode
  readonly className?: string
}

const VALIDATION_CLASS: Record<
  Exclude<FieldValidationState, 'none'>,
  string
> = {
  error: 'text-kro-banner-danger',
  warning: 'text-kro-banner-warning',
  success: 'text-kro-focus-green',
}

export function Field({
  label,
  hint,
  required = false,
  validationMessage,
  validationState = 'none',
  orientation = 'vertical',
  size = 'medium',
  htmlFor,
  children,
  className,
}: FieldProps) {
  const generatedId = useId()
  const labelId = `${generatedId}-label`
  const hintId = `${generatedId}-hint`
  const messageId = `${generatedId}-message`
  const density = densityForFluentSize(size)
  const showMessage =
    validationState !== 'none' && validationMessage !== undefined

  const describedBy = [
    hint !== undefined ? hintId : undefined,
    showMessage ? messageId : undefined,
  ]
    .filter((id): id is string => id !== undefined)
    .join(' ')

  return (
    <div
      role="group"
      data-slot="field"
      data-density={density}
      data-orientation={orientation}
      data-validation={validationState}
      aria-labelledby={labelId}
      aria-describedby={describedBy === '' ? undefined : describedBy}
      className={cn(
        'w-full text-kro-fore',
        orientation === 'horizontal'
          ? 'flex flex-row items-start gap-kro-medium'
          : 'flex flex-col gap-kro-small',
        className,
      )}
    >
      <span id={labelId} className="shrink-0">
        <Label htmlFor={htmlFor} density={density}>
          {label}
          {required ? (
            <>
              <span aria-hidden="true">*</span>
              <span className="sr-only"> required</span>
            </>
          ) : null}
        </Label>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-kro-tiny">
        {children}
        {hint === undefined ? null : (
          <p
            id={hintId}
            className={cn('m-0 text-kro-fore-secondary', DENSITY_TYPE[density])}
          >
            {hint}
          </p>
        )}
        {showMessage ? (
          <p
            id={messageId}
            role={validationState === 'error' ? 'alert' : undefined}
            className={cn(
              'm-0',
              DENSITY_TYPE[density],
              VALIDATION_CLASS[validationState],
            )}
          >
            {validationMessage}
          </p>
        ) : null}
      </div>
    </div>
  )
}
