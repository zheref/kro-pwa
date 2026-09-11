import { Avatar, type AvatarSize, type PresenceKind } from './Avatar'
import { Text, type TextSize } from './Text'
import { cn } from '../../system/utils/cn'

/**
 * Persona — Fluent 2 Content, painted with KroTokens.
 *
 * A person plus secondary and tertiary copy. Presence rides on the
 * avatar; the supporting lines are words. Colour is never the only
 * signal.
 */

export type PersonaSize =
  | 'extra-small'
  | 'small'
  | 'medium'
  | 'large'
  | 'extra-large'
  | 'huge'

export type PersonaTextAlignment = 'start' | 'center'

const PERSONA_AVATAR: Record<PersonaSize, AvatarSize> = {
  'extra-small': 20,
  small: 24,
  medium: 32,
  large: 48,
  'extra-large': 56,
  huge: 72,
}

const PERSONA_NAME_SIZE: Record<PersonaSize, TextSize> = {
  'extra-small': 200,
  small: 200,
  medium: 300,
  large: 400,
  'extra-large': 500,
  huge: 600,
}

const PERSONA_SUPPORTING_SIZE: Record<PersonaSize, TextSize> = {
  'extra-small': 100,
  small: 100,
  medium: 200,
  large: 200,
  'extra-large': 300,
  huge: 300,
}

export interface PersonaProps {
  readonly name: string
  readonly secondaryText?: string
  readonly tertiaryText?: string
  readonly presence?: PresenceKind
  readonly size?: PersonaSize
  readonly textAlignment?: PersonaTextAlignment
}

export function Persona({
  name,
  secondaryText,
  tertiaryText,
  presence,
  size = 'medium',
  textAlignment = 'start',
}: PersonaProps) {
  return (
    <span
      data-slot="persona"
      className={cn(
        'inline-flex gap-kro-small',
        textAlignment === 'center'
          ? 'flex-col items-center text-center'
          : 'flex-row items-center text-start',
      )}
    >
      <Avatar name={name} size={PERSONA_AVATAR[size]} presence={presence} />
      <span className="flex min-w-0 flex-col">
        <Text size={PERSONA_NAME_SIZE[size]} weight="semibold">
          {name}
        </Text>
        {secondaryText === undefined ? null : (
          <Text size={PERSONA_SUPPORTING_SIZE[size]} tone="secondary">
            {secondaryText}
          </Text>
        )}
        {tertiaryText === undefined ? null : (
          <Text size={PERSONA_SUPPORTING_SIZE[size]} tone="secondary">
            {tertiaryText}
          </Text>
        )}
      </span>
    </span>
  )
}
