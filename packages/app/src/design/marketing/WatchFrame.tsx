import type { CSSProperties } from 'react'
import { cn } from '../system/utils/cn'
import { frameImageProps } from './frameImage'

export interface WatchFrameProps {
  /** Screenshot URL. */
  readonly src: string
  /** What the screenshot shows — the image's alt text. */
  readonly alt: string
  readonly width: number
  readonly height: number
  readonly priority?: boolean
  readonly className?: string
}

/** A rounded-rectangle watch case with a crown, around a screenshot. */
export function WatchFrame({
  src,
  alt,
  width,
  height,
  priority,
  className,
}: WatchFrameProps) {
  return (
    <div
      className={cn('kro-device kro-device--watch', className)}
      style={{ '--kro-device-w': `${width + 16}px` } as CSSProperties}
    >
      <img {...frameImageProps({ src, width, height, priority })} alt={alt} />
    </div>
  )
}
