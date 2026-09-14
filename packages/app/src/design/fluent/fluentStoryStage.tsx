/**
 * The backdrop every Fluent 2 story is judged on.
 *
 * Same reason as the HIG stage: glass, frosted badges and translucent
 * thumbs cannot be judged on a white page. This is that stage for the
 * Fluent gallery, once.
 */

import type { ReactNode } from 'react'
import {
  HIG_STAGE_BACKDROP,
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
  type HigStageProps,
} from '../hig/higStoryStage'

export const FLUENT_STAGE_BACKDROP = HIG_STAGE_BACKDROP

export type FluentStageProps = HigStageProps

export function FluentStage(props: FluentStageProps) {
  return <HigStage {...props} />
}

export function FluentBothSchemes({
  gradient = false,
  children,
}: {
  readonly gradient?: boolean
  readonly children: ReactNode
}) {
  return <HigBothSchemes gradient={gradient}>{children}</HigBothSchemes>
}

export function FluentRow({
  label,
  children,
}: {
  readonly label: string
  readonly children: ReactNode
}) {
  return <HigRow label={label}>{children}</HigRow>
}

export function FluentDensities({
  render,
  gradient = false,
}: {
  readonly render: (density: 'compact' | 'comfortable') => ReactNode
  readonly gradient?: boolean
}) {
  return <HigDensities render={render} gradient={gradient} />
}
