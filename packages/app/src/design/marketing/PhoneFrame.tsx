import type { CSSProperties } from 'react'
import { cn } from '../system/utils/cn'
import { ANDROID_PHONE, IPHONE, outerWidth, renderedWidth } from './deviceSpecs'
import { frameImageProps } from './frameImage'

export interface PhoneFrameProps {
  /** Screenshot URL. */
  readonly src: string
  /** What the screenshot shows — the image's alt text. */
  readonly alt: string
  /** Intrinsic width of the screenshot file, px (reserves the box; no layout shift). */
  readonly width: number
  /** Intrinsic height of the screenshot file, px. */
  readonly height: number
  /** iPhone (Dynamic Island, thick bezel) or Android (punch-hole, thin bezel). */
  readonly platform?: 'ios' | 'android'
  /**
   * The device shown at this fraction of its logical size (390 pt wide for an
   * iPhone, 412 for the Android). The frame never exceeds its column: the
   * width is a ceiling, and the bezel shrinks with the screen.
   */
  readonly scale?: number
  /** Load eagerly at high priority (above the fold only). */
  readonly priority?: boolean
  readonly className?: string
}

/**
 * A pure-CSS phone around a screenshot: the iPhone's 390 x 844 pt screen with a
 * uniform 11 pt bezel, a 47 pt screen radius inside a 55 pt body, the Dynamic
 * Island and the side keys; or the Android's 412 x 892 pt screen with a thin
 * bezel, a punch-hole and flatter corners.
 */
export function PhoneFrame({
  src,
  alt,
  width,
  height,
  platform = 'ios',
  scale = 1,
  priority,
  className,
}: PhoneFrameProps) {
  const spec = platform === 'android' ? ANDROID_PHONE : IPHONE
  return (
    <div
      className={cn(
        'kro-device kro-device--phone',
        `kro-device--${platform}`,
        className,
      )}
      style={
        {
          '--kro-device-w': `${renderedWidth(spec, scale)}px`,
          '--kro-spec-w': outerWidth(spec),
          '--kro-screen-ar': `${spec.screenWidth} / ${spec.screenHeight}`,
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
