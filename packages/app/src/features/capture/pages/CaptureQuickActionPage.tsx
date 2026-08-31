'use client'

/**
 * The default quick action's stateful container (`RC-37`).
 *
 * Reads which destination is selected — through the shell's own root-level
 * Selector, never by importing the shell's state shape (`RC-20`) — and
 * dispatches the one intent the disc carries.
 */

import { useCallback } from 'react'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import { selectSelectedDestination } from '../../main/MainSelectors'
import { userDidRequestCapture } from '../CaptureFeature'
import { CaptureKind } from '../CaptureRules'
import {
  CaptureQuickActionFragment,
  captureQuickActionShows,
} from './CaptureQuickActionFragment'

export function CaptureQuickActionPage() {
  const dispatch = useAppDispatch()
  const selected = useAppSelector(selectSelectedDestination)

  const onPress = useCallback(() => {
    // Canon's `.init(label: "Quick Add", glyph: "plus") { showPrompt(kind: .task) }`
    // — the pairing this disc inherits. `initialStart` is omitted, so the draft
    // opens unscheduled and merely offers the quarter hour nearest `now`; the
    // Plan timeline's press-to-create is the caller that passes one.
    dispatch(
      userDidRequestCapture({ kind: CaptureKind.task, now: new Date() }),
    )
  }, [dispatch])

  return (
    <CaptureQuickActionFragment
      isVisible={captureQuickActionShows(selected)}
      onPress={onPress}
    />
  )
}
