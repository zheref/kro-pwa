import type { CSSProperties } from 'react'
import { cn } from '../system/utils/cn'
import { frameImageProps } from './frameImage'

export interface PhoneFrameProps {
  /** Screenshot URL. */
  readonly src: string
  /** What the screenshot shows — the frame's accessible name. */
  readonly alt: string
  /** Intrinsic width of the screenshot, px. Also the frame's max width. */
  readonly width: number
  /** Intrinsic height of the screenshot, px. */
  readonly height: number
  /** Load eagerly at high priority (above the fold only). */
  readonly priority?: boolean
  readonly className?: string
}

/** A pure-CSS iPhone-style bezel around a screenshot. */
export function PhoneFrame({
  src,
  alt,
  width,
  height,
  priority,
  className,
}: PhoneFrameProps) {
  return (
    <div
      role="img"
      aria-label={alt}
      className={cn('kro-device kro-device--phone', className)}
      style={{ '--kro-device-w': `${width + 20}px` } as CSSProperties}
    >
      <img {...frameImageProps({ src, width, height, priority })} alt="" />
    </div>
  )
}
