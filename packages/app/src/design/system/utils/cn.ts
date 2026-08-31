import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * The shadcn/ui class helper: conditional classes in, one deduplicated string
 * out.
 *
 * `clsx` flattens the conditions; `twMerge` resolves Tailwind conflicts so a
 * caller's `className` genuinely overrides a component's default instead of
 * losing to it on source order. Without the merge, `<Button className="p-0">`
 * would be a coin flip decided by where Tailwind happened to emit `p-2`.
 *
 * The `kro-*` classes are not Tailwind utilities, so `twMerge` leaves them
 * untouched — which is what we want: the glass material and a padding utility
 * are not in conflict.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
