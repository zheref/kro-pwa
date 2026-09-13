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
export type ImageViewShape = 'default' | 'circular'

export interface ImageViewProps {
  readonly src: string
  readonly alt: string
  readonly decorative?: boolean
  readonly aspect?: ImageViewAspect
  readonly caption?: string
  readonly fallback?: ReactNode
  readonly className?: string
  readonly density?: ControlDensity
  readonly shape?: ImageViewShape
  readonly shadow?: boolean
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
  shape = 'default',
  shadow = false,
}: ImageViewProps) {
  const [failed, setFailed] = useState(src.length === 0)

  useEffect(() => {
    setFailed(src.length === 0)
  }, [src])

  const resolvedAlt = decorative ? '' : alt
  const showFallback = failed && fallback !== undefined
  const frameClass = cn(
    'h-full w-full overflow-hidden bg-kro-back-inner object-cover',
    shape === 'circular' ? 'rounded-kro-pill' : 'rounded-kro-card',
    shadow ? 'shadow-[var(--kro-shadow-subtle)]' : undefined,
    className,
  )

  const frame = showFallback ? (
    <div
      data-slot="image-view-fallback"
      data-density={density}
      data-shape={shape}
      data-shadow={shadow || undefined}
      className={cn(
        'flex h-full w-full items-center justify-center',
        frameClass,
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
      data-shape={shape}
      data-shadow={shadow || undefined}
      className={frameClass}
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
