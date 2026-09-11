import { type ReactNode, useEffect, useState } from 'react'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_TYPE,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * ImageView — HIG "Image views", painted with KroTokens.
 *
 * A still frame at a known aspect, recessed one step from the card it sits
 * in. `alt` is required; an empty string is only honest when `decorative`
 * is set, which is how a cover used as wallpaper stays out of the
 * accessibility tree. A failed load swaps to `fallback` so a missing
 * capture never leaves a broken-image glyph.
 */

export type ImageViewAspect = '1/1' | '4/3' | '16/9'

export interface ImageViewProps {
  readonly src: string
  readonly alt: string
  readonly decorative?: boolean
  readonly aspect?: ImageViewAspect
  readonly caption?: string
  readonly fallback?: ReactNode
  readonly className?: string
  readonly density?: ControlDensity
}

export function ImageView({
  src,
  alt,
  decorative = false,
  aspect,
  caption,
  fallback,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: ImageViewProps) {
  const [failed, setFailed] = useState(src.length === 0)

  useEffect(() => {
    setFailed(src.length === 0)
  }, [src])

  const resolvedAlt = decorative ? '' : alt
  const showFallback = failed && fallback !== undefined

  const frame = showFallback ? (
    <div
      data-slot="image-view-fallback"
      data-density={density}
      className={cn(
        'flex h-full w-full items-center justify-center overflow-hidden rounded-kro-card bg-kro-back-inner object-cover',
        className,
      )}
      style={aspect === undefined ? undefined : { aspectRatio: aspect }}
    >
      {fallback}
    </div>
  ) : (
    <img
      data-slot="image-view"
      data-density={density}
      src={src}
      alt={resolvedAlt}
      className={cn(
        'h-full w-full rounded-kro-card bg-kro-back-inner object-cover',
        className,
      )}
      style={aspect === undefined ? undefined : { aspectRatio: aspect }}
      onError={() => setFailed(true)}
    />
  )

  if (caption === undefined) return frame

  return (
    <figure
      data-density={density}
      className={cn('m-0 flex flex-col gap-kro-small', DENSITY_TYPE[density])}
    >
      {frame}
      <figcaption
        className={cn('text-kro-fore-secondary', DENSITY_TYPE[density])}
      >
        {caption}
      </figcaption>
    </figure>
  )
}
