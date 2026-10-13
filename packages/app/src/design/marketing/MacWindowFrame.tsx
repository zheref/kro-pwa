import type { CSSProperties } from 'react'
import { GlassSurface } from '../system/glass/GlassSurface'
import { cn } from '../system/utils/cn'
import { MAC_WINDOW } from './deviceSpecs'
import { frameImageProps } from './frameImage'

export interface MacWindowFrameProps {
  readonly src: string
  /** What the screenshot shows — the image's alt text. */
  readonly alt: string
  /** Intrinsic width of the screenshot file, px. */
  readonly width: number
  /** Intrinsic height of the screenshot file, px. */
  readonly height: number
  /** Text centred in the title bar, e.g. the app name. Decorative. */
  readonly title?: string
  /**
   * The window shown at this fraction of its logical 1440 pt width. A ceiling,
   * not a size: the window shrinks into its column and keeps its proportions.
   */
  readonly scale?: number
  readonly priority?: boolean
  readonly className?: string
}

/**
 * A macOS window around a capture of the app at its logical 1440 x 900 pt:
 * a 28 pt title bar with the three coloured traffic lights over the content.
 */
export function MacWindowFrame({
  src,
  alt,
  width,
  height,
  title,
  scale = 1,
  priority,
  className,
}: MacWindowFrameProps) {
  return (
    <div
      className={cn('kro-device kro-device--mac', className)}
      style={
        {
          '--kro-device-w': `${Math.round(MAC_WINDOW.contentWidth * scale)}px`,
          '--kro-spec-w': MAC_WINDOW.contentWidth,
        } as CSSProperties
      }
    >
      <div className="kro-device__body">
        <GlassSurface
          material="bar"
          aria-hidden="true"
          className="kro-device__titlebar"
        >
          <span className="kro-device__lights" aria-hidden="true">
            <span className="kro-device__light kro-device__light--close" />
            <span className="kro-device__light kro-device__light--minimize" />
            <span className="kro-device__light kro-device__light--zoom" />
          </span>
          {title === undefined ? null : (
            <span className="kro-device__title">{title}</span>
          )}
        </GlassSurface>
        <img {...frameImageProps({ src, width, height, priority })} alt={alt} />
      </div>
    </div>
  )
}
