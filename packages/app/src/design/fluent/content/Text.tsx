import type { ReactNode } from 'react'
import { cn } from '../../system/utils/cn'

/**
 * Text — Fluent 2 Content, painted with KroTokens.
 *
 * Typography opinions as a component: size, weight, wrap, truncate,
 * italic. Tone is a token class AND the words in the children — never
 * colour alone.
 */

export const TEXT_SIZES = [
  100, 200, 300, 400, 500, 600, 700, 800, 900, 1000,
] as const

export type TextSize = (typeof TEXT_SIZES)[number]

export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold'

export type TextTone = 'primary' | 'secondary' | 'destructive'

export type TextAs = 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'label'

const TEXT_SIZE_CLASS: Record<TextSize, string> = {
  100: 'text-[11px]',
  200: 'text-[12px]',
  300: 'text-[13px]',
  400: 'text-[14px]',
  500: 'text-[16px]',
  600: 'text-[18px]',
  700: 'text-[20px]',
  800: 'text-[24px]',
  900: 'text-[28px]',
  1000: 'text-[32px]',
}

const TEXT_WEIGHT_CLASS: Record<TextWeight, string> = {
  regular: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold',
}

const TEXT_TONE_CLASS: Record<TextTone, string> = {
  primary: 'text-kro-fore',
  secondary: 'text-kro-fore-secondary',
  destructive: 'text-kro-banner-danger',
}

export interface TextProps {
  readonly size?: TextSize
  readonly weight?: TextWeight
  readonly italic?: boolean
  readonly truncate?: boolean
  readonly wrap?: boolean
  readonly as?: TextAs
  readonly tone?: TextTone
  readonly className?: string
  readonly children: ReactNode
}

export function Text({
  size = 300,
  weight = 'regular',
  italic = false,
  truncate = false,
  wrap = true,
  as: Tag = 'span',
  tone = 'primary',
  className,
  children,
}: TextProps) {
  return (
    <Tag
      data-slot="text"
      className={cn(
        'm-0',
        TEXT_SIZE_CLASS[size],
        TEXT_WEIGHT_CLASS[weight],
        TEXT_TONE_CLASS[tone],
        italic && 'italic',
        truncate && 'truncate',
        wrap === false && 'whitespace-nowrap',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
