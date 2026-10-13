import type { CSSProperties } from 'react'
import { cn } from '../system/utils/cn'
import { IPAD, outerWidth, renderedWidth } from './deviceSpecs'
import { frameImageProps } from './frameImage'

export interface TabletFrameProps {
  readonly src: string
  /** What the screenshot shows — the image's alt text. */
  readonly alt: string
  /** Intrinsic width of the screenshot file, px. */
  readonly width: number
  /** Intrinsic height of the screenshot file, px. */
  readonly height: number
  /** Shown at this fraction of the iPad's 820 pt logical width. */
  readonly scale?: number
  readonly priority?: boolean
  readonly className?: string
}

/**
 * A portrait 11-inch iPad around a screenshot: an 820 x 1180 pt screen, an
 * 18 pt bezel and a camera dot. The screenshot is cropped to the screen from
 * the top (`object-position: top`) when its ratio is not the iPad's.
 */
export function TabletFrame({
  src,
  alt,
  width,
  height,
  scale = 1,
  priority,
  className,
}: TabletFrameProps) {
  return (
    <div
      className={cn('kro-device kro-device--tablet', className)}
      style={
        {
          '--kro-device-w': `${renderedWidth(IPAD, scale)}px`,
          '--kro-spec-w': outerWidth(IPAD),
          '--kro-screen-ar': `${IPAD.screenWidth} / ${IPAD.screenHeight}`,
        } as CSSProperties
      }
    >
      <div className="kro-device__body">
        <img {...frameImageProps({ src, width, height, priority })} alt={alt} />
        <span className="kro-device__cutout" aria-hidden="true" />
      </div>
    </div>
  )
}
