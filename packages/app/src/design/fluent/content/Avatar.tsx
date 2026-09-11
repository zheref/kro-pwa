import { useState, type CSSProperties } from 'react'
import type { ColorRole } from '../../system/tokens/roles'
import { colorVar } from '../../system/tokens/roles'
import { cn } from '../../system/utils/cn'

/**
 * Avatar — Fluent 2 Content, painted with KroTokens.
 *
 * An image or initials for a person. Colour is never the only signal:
 * colourful fills still show initials, and presence is a named word on
 * the badge, not a mute dot.
 */

export const AVATAR_SIZES = [
  16, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 96, 120, 128,
] as const

export type AvatarSize = (typeof AVATAR_SIZES)[number]

export type AvatarShape = 'circular' | 'square'

export type AvatarColor = 'neutral' | 'brand' | 'colorful'

export const PRESENCE_KINDS = [
  'available',
  'away',
  'busy',
  'do-not-disturb',
  'offline',
  'out-of-office',
  'unknown',
] as const

export type PresenceKind = (typeof PRESENCE_KINDS)[number]

const COLORFUL_ROLES = [
  'badgeBlue',
  'badgePurple',
  'badgeIndigo',
  'badgeTeal',
  'badgeCyan',
  'badgePink',
  'badgeMint',
  'badgeOrange',
  'badgeGreen',
] as const satisfies readonly ColorRole[]

const PRESENCE_ROLE: Record<PresenceKind, ColorRole> = {
  available: 'focusGreen',
  away: 'rewardYellow',
  busy: 'bannerDanger',
  'do-not-disturb': 'kroRed',
  offline: 'payneGray',
  'out-of-office': 'badgePurple',
  unknown: 'mist',
}

const PRESENCE_BADGE_PX = 10

export function avatarSizePx(size: AvatarSize = 32): number {
  return size
}

export function initialsFromName(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0)
  if (words.length === 0) return '?'
  const firstWord = words[0] ?? ''
  const secondWord = words[1]
  const first = firstWord.charAt(0)
  const second = secondWord === undefined ? '' : secondWord.charAt(0)
  const letters = `${first}${second}`.toUpperCase()
  return letters.length === 0 ? '?' : letters
}

export function presenceLabel(kind: PresenceKind): string {
  return kind.replaceAll('-', ' ')
}

function colorfulRoleForName(name: string): ColorRole {
  let hash = 0
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0
  }
  const picked = COLORFUL_ROLES[Math.abs(hash) % COLORFUL_ROLES.length]
  return picked ?? 'badgeBlue'
}

function initialsFontPx(size: AvatarSize): number {
  if (size <= 20) return 8
  if (size <= 28) return 10
  if (size <= 40) return 12
  if (size <= 56) return 16
  if (size <= 72) return 20
  if (size <= 96) return 28
  return 32
}

export interface PresenceBadgeProps {
  readonly presence: PresenceKind
}

export function PresenceBadge({ presence }: PresenceBadgeProps) {
  return (
    <span
      data-slot="presence-badge"
      role="img"
      aria-label={presenceLabel(presence)}
      className="absolute end-0 bottom-0 rounded-full"
      style={{
        width: PRESENCE_BADGE_PX,
        height: PRESENCE_BADGE_PX,
        backgroundColor: colorVar(PRESENCE_ROLE[presence]),
        boxShadow: `0 0 0 2px ${colorVar('back')}`,
      }}
    />
  )
}

export interface AvatarProps {
  readonly name: string
  readonly image?: string
  readonly size?: AvatarSize
  readonly shape?: AvatarShape
  readonly color?: AvatarColor
  readonly initials?: string
  readonly presence?: PresenceKind
}

export function Avatar({
  name,
  image,
  size = 32,
  shape = 'circular',
  color = 'brand',
  initials,
  presence,
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string | undefined>(undefined)
  const px = avatarSizePx(size)
  const shown = initials ?? initialsFromName(name)
  const showImage =
    image !== undefined && image.length > 0 && failedSrc !== image

  const faceStyle: CSSProperties = {
    fontSize: initialsFontPx(size),
    ...(color === 'colorful'
      ? {
          backgroundColor: colorVar(colorfulRoleForName(name)),
          color: colorVar('absolute'),
        }
      : undefined),
  }

  return (
    <span
      data-slot="avatar"
      role="img"
      aria-label={name}
      className="relative inline-flex shrink-0"
      style={{ width: px, height: px }}
    >
      <span
        className={cn(
          'kro-fluent-avatar h-full w-full',
          shape === 'circular' ? 'rounded-full' : 'rounded-kro-small',
          color === 'brand' && 'bg-kro-accent text-kro-on-accent',
          color === 'neutral' && 'bg-kro-back-inner text-kro-fore',
        )}
        style={faceStyle}
        aria-hidden
      >
        {showImage ? (
          <img
            src={image}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setFailedSrc(image)}
          />
        ) : (
          shown
        )}
      </span>
      {presence === undefined ? null : <PresenceBadge presence={presence} />}
    </span>
  )
}
