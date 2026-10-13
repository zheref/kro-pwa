import type { CSSProperties } from 'react'
import { cn } from '../system/utils/cn'
import { WATCH_45MM, outerWidth, renderedWidth } from './deviceSpecs'
import { frameImageProps } from './frameImage'

export interface WatchFrameProps {
  /** Screenshot URL. */
  readonly src: string
  /** What the screenshot shows — the image's alt text. */
  readonly alt: string
  /** Intrinsic width of the screenshot file, px. */
  readonly width: number
  /** Intrinsic height of the screenshot file, px. */
  readonly height: number
  /** Shown at this fraction of the watch's logical size (198 pt screen). */
  readonly scale?: number
  readonly priority?: boolean
  readonly className?: string
}

/**
 * A 45 mm Apple Watch around a screenshot: the 198 x 242 pt screen inside a
 * black bezel and a rounded-rectangle case, with the Digital Crown and the
 * side button.
 */
export function WatchFrame({
  src,
  alt,
  width,
  height,
  scale = 1,
  priority,
  className,
}: WatchFrameProps) {
  return (
    <div
      className={cn('kro-device kro-device--watch', className)}
      style={
        {
          '--kro-device-w': `${renderedWidth(WATCH_45MM, scale)}px`,
          '--kro-spec-w': outerWidth(WATCH_45MM),
          '--kro-screen-ar': `${WATCH_45MM.screenWidth} / ${WATCH_45MM.screenHeight}`,
        } as CSSProperties
      }
    >
      <div className="kro-device__body">
        <img {...frameImageProps({ src, width, height, priority })} alt={alt} />
      </div>
    </div>
  )
}
