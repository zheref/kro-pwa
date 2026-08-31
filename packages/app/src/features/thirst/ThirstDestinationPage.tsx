'use client'

/**
 * Mounts a Thirst-gated sidebar destination — Priority Matrix, Board,
 * Blueprints, Habits (`#35`'s four routes). `notifications` is a sheet on a
 * different surface (reached from the Profile menu on iPhone; canon's
 * `docs/Features/Thirst.md`), not a sidebar route, so it is out of this
 * component's (and this issue's) scope.
 *
 * `packages/app/src/features/main/DestinationPage.tsx` documents itself as
 * "the swap point" every destination's feature child edits to replace the
 * shared placeholder — but it is a single file every in-flight feature
 * child's route would contend to edit, and `#35`'s declared file lane is its
 * four `apps/web` route directories only, not `features/main/**`. So this
 * component stands in for that swap for exactly these four kinds, still
 * firing the identical `onDestinationRouteMounted` lifecycle event
 * `DestinationPage.tsx` fires — the sidebar/tab-bar highlight and the
 * URL-is-authority contract (`RC-17`, `RC-63`) are unaffected by which file
 * mounts the destination. Named as a divergence in the PR.
 */
import { useEffect } from 'react'
import { useAppDispatch } from '../../library/hooks'
import { onDestinationRouteMounted } from '../main/MainFeature'
import { ComingSoonPage } from './ComingSoonPage'

export type ThirstDestinationKind = 'matrix' | 'board' | 'blueprints' | 'habits'

export interface ThirstDestinationPageProps {
  readonly kind: ThirstDestinationKind
}

export function ThirstDestinationPage({ kind }: ThirstDestinationPageProps) {
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(onDestinationRouteMounted({ destination: { kind } }))
  }, [dispatch, kind])

  return <ComingSoonPage featureKey={kind} />
}
