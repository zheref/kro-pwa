import type { CSSProperties } from 'react'
import { GlassSurface } from '../system/glass/GlassSurface'
import { cn } from '../system/utils/cn'
import { frameImageProps } from './frameImage'

export interface MacWindowFrameProps {
  readonly src: string
  /** What the screenshot shows — the image's alt text. */
  readonly alt: string
  readonly width: number
  readonly height: number
  /** Text centred in the title bar, e.g. the app name. Decorative. */
  readonly title?: string
  readonly priority?: boolean
  readonly className?: string
}

/** A macOS-style window — glass title bar, traffic lights — around a screenshot. */
export function MacWindowFrame({
  src,
  alt,
  width,
  height,
  title,
  priority,
  className,
}: MacWindowFrameProps) {
  return (
    <div
      className={cn('kro-device kro-device--mac', className)}
      style={{ '--kro-device-w': `${width}px` } as CSSProperties}
    >
      <GlassSurface
        material="bar"
        aria-hidden="true"
        className="kro-device__titlebar"
      >
        <span className="kro-device__lights" aria-hidden="true">
          <span className="kro-device__light" />
          <span className="kro-device__light" />
          <span className="kro-device__light" />
        </span>
        {title === undefined ? null : (
          <span className="kro-device__title">{title}</span>
        )}
      </GlassSurface>
      <img {...frameImageProps({ src, width, height, priority })} alt={alt} />
    </div>
  )
}
