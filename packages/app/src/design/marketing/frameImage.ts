import type { ImgHTMLAttributes } from 'react'

export interface FrameImageInput {
  readonly src: string
  readonly width: number
  readonly height: number
  /** Above-the-fold image: load eagerly and at high priority. */
  readonly priority?: boolean
}

/**
 * The `<img>` attributes every device frame shares.
 *
 * Explicit `width`/`height` reserve the box before the bytes arrive (no
 * layout shift). The frame carries the accessible name, so the image itself is
 * presentational: `alt=""`.
 */
export function frameImageProps({
  src,
  width,
  height,
  priority = false,
}: FrameImageInput): ImgHTMLAttributes<HTMLImageElement> & {
  readonly fetchPriority?: 'high'
} {
  return {
    src,
    width,
    height,
    alt: '',
    decoding: 'async',
    loading: priority ? 'eager' : 'lazy',
    ...(priority ? { fetchPriority: 'high' as const } : {}),
  }
}
