import { Moon, Sun } from 'lucide-react'
import { ICON_SIZE } from '../system/icons/icons'
import { cn } from '../system/utils/cn'

export type ThemeValue = 'light' | 'dark'

export interface ThemeToggleProps {
  /** The current theme. The toggle is controlled. */
  readonly value: ThemeValue
  /** Asked for the opposite theme. The owner decides what to do with it. */
  readonly onToggle: (next: ThemeValue) => void
  /** The control's accessible name. Default "Dark mode". */
  readonly label?: string
  readonly className?: string
}

/**
 * A sun/moon switch. Pure: it never touches the DOM theme — the page that owns
 * the preference applies it. `aria-pressed` is "dark mode is on".
 */
export function ThemeToggle({
  value,
  onToggle,
  label = 'Dark mode',
  className,
}: ThemeToggleProps) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={value === 'dark'}
      data-value={value}
      className={cn('kro-theme-toggle', className)}
      onClick={() => onToggle(value === 'dark' ? 'light' : 'dark')}
    >
      <Sun
        aria-hidden="true"
        size={ICON_SIZE.medium}
        className="kro-theme-toggle__icon kro-theme-toggle__icon--sun"
      />
      <Moon
        aria-hidden="true"
        size={ICON_SIZE.medium}
        className="kro-theme-toggle__icon kro-theme-toggle__icon--moon"
      />
    </button>
  )
}
