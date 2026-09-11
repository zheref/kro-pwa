/**
 * Fluent 2 Skeleton, painted with KroTokens.
 *
 * A placeholder for content that is still arriving. Shape is the signal,
 * not colour — `kro-fluent-skeleton` in `fluent.css` already respects
 * `prefers-reduced-motion`. The page must keep a text alternative; this
 * control is `aria-hidden`.
 */

import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from 'react'
import { cn } from '../../system/utils/cn'

export type SkeletonAnimation = 'pulse' | 'wave' | 'none'
export type SkeletonAppearance = 'opaque' | 'translucent'
export type SkeletonItemShape = 'rectangle' | 'circle'

interface SkeletonContextValue {
  readonly animation: SkeletonAnimation
  readonly appearance: SkeletonAppearance
}

const SkeletonContext = createContext<SkeletonContextValue>({
  animation: 'pulse',
  appearance: 'opaque',
})

function cssLength(
  value: string | number | undefined,
  fallback: string,
): string {
  if (value === undefined) return fallback
  return typeof value === 'number' ? `${value}px` : value
}

export interface SkeletonProps {
  readonly animation?: SkeletonAnimation
  readonly appearance?: SkeletonAppearance
  readonly children?: ReactNode
  readonly className?: string
}

export function Skeleton({
  animation = 'pulse',
  appearance = 'opaque',
  children,
  className,
}: SkeletonProps) {
  return (
    <SkeletonContext.Provider value={{ animation, appearance }}>
      <div
        data-slot="skeleton"
        data-animation={animation}
        data-appearance={appearance}
        aria-hidden
        className={cn('flex w-full flex-col gap-2', className)}
      >
        {children}
      </div>
    </SkeletonContext.Provider>
  )
}

export interface SkeletonItemProps {
  readonly width?: string | number
  readonly height?: string | number
  readonly shape?: SkeletonItemShape
  readonly animation?: SkeletonAnimation
  readonly appearance?: SkeletonAppearance
  readonly className?: string
}

export function SkeletonItem({
  width,
  height,
  shape = 'rectangle',
  animation: animationProp,
  appearance: appearanceProp,
  className,
}: SkeletonItemProps) {
  const ctx = useContext(SkeletonContext)
  const animation = animationProp ?? ctx.animation
  const appearance = appearanceProp ?? ctx.appearance
  const isCircle = shape === 'circle'
  const resolvedWidth = cssLength(
    width,
    isCircle ? cssLength(height, '32px') : '100%',
  )
  const resolvedHeight = cssLength(height, isCircle ? resolvedWidth : '16px')

  const style: CSSProperties = {
    width: resolvedWidth,
    height: resolvedHeight,
    opacity: appearance === 'translucent' ? 0.55 : undefined,
    borderRadius: isCircle ? 'var(--kro-radius-pill)' : undefined,
  }

  return (
    <span
      data-slot="skeleton-item"
      data-animation={animation}
      data-appearance={appearance}
      data-shape={shape}
      aria-hidden
      className={cn('kro-fluent-skeleton overflow-hidden', className)}
      style={style}
    />
  )
}
