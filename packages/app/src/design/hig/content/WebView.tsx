import { GlassSurface } from '../../system/glass/GlassSurface'
import {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_TYPE,
} from '../../system/density'
import { cn } from '../../system/utils/cn'

/**
 * WebView — HIG "Web views", painted with KroGlass.
 *
 * Another document, framed in the same surface material as a card, with a
 * title bar so the embed is named in words rather than only by what it
 * paints. The iframe is maximally restricted by default (`sandbox=""`).
 * `allow-scripts` and `allow-same-origin` are never granted together —
 * that pairing is the classic sandbox escape.
 */

export interface WebViewProps {
  readonly title: string
  readonly src?: string
  readonly srcDoc?: string
  readonly sandbox?: string
  readonly className?: string
  readonly density?: ControlDensity
}

const DANGEROUS_PAIR = ['allow-scripts', 'allow-same-origin'] as const

/**
 * Token-list for the iframe `sandbox` attribute.
 *
 * An empty string is maximum restriction. If a caller asks for both
 * `allow-scripts` and `allow-same-origin`, both tokens are dropped so the
 * pair can never ship.
 */
export function restrictedSandbox(sandbox?: string): string {
  const tokens = (sandbox ?? '').trim().split(/\s+/).filter(Boolean)
  const hasScripts = tokens.includes(DANGEROUS_PAIR[0])
  const hasSameOrigin = tokens.includes(DANGEROUS_PAIR[1])
  if (hasScripts && hasSameOrigin) {
    return tokens
      .filter(
        (token) => token !== DANGEROUS_PAIR[0] && token !== DANGEROUS_PAIR[1],
      )
      .join(' ')
  }
  return tokens.join(' ')
}

export function WebView({
  title,
  src,
  srcDoc,
  sandbox,
  className,
  density = DEFAULT_CONTROL_DENSITY,
}: WebViewProps) {
  return (
    <GlassSurface
      data-slot="web-view"
      data-density={density}
      className={cn(
        'flex h-64 flex-col overflow-hidden rounded-kro-surface',
        className,
      )}
    >
      <div
        className={cn(
          'border-b border-kro-hairline font-medium text-kro-fore',
          density === 'compact'
            ? 'px-kro-small py-kro-tiny'
            : 'px-kro-medium py-kro-small',
          DENSITY_TYPE[density],
        )}
      >
        {title}
      </div>
      <iframe
        title={title}
        src={src}
        srcDoc={srcDoc}
        sandbox={restrictedSandbox(sandbox)}
        className="min-h-0 w-full flex-1 border-0 bg-kro-absolute"
      />
    </GlassSurface>
  )
}
