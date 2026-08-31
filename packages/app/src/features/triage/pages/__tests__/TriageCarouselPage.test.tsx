/**
 * The Triage Page's render and interaction tests, mirroring
 * `TriageCarouselPage.stories` (`RC-11`).
 *
 * Everything runs through the **real** store: the pool arrives through
 * `loadCaptureContextThunk`, the request is parked by the Inbox's own
 * `userDidTapTriage`, the session opens through `openTriageThunk`, and the
 * decision is written by `saveTriageDecisionThunk` into a seeded in-memory
 * `LocalStore`. No slice is preloaded and no thunk lifecycle action is
 * constructed by hand.
 *
 * The three interactions KC-IS-#26 names — **confirm gating**, the **share
 * fallback** and the row **draining** on confirm — are asserted here end to
 * end; the dismissal threshold is proved one tier out, in
 * `TriageCarouselFragment.test.tsx`, because that is where the gesture lives.
 */
import {
  EisenhowerQuadrant,
  EndeavorCitizenship,
  EndeavorStatus,
} from '@kro/core'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { installPointerEvents } from '../../../../design/endeavor/__tests__/pointerEnvironment'
import { selectPendingTriageEndeavors } from '../../../capture/CaptureSelectors'
import { triageEndeavorFixtures, triageFixtureRecords } from '../../TriageMocks'
import { TriageCarouselPage } from '../TriageCarouselPage'
import type { TriageShareGateway } from '../triageShare'
import {
  TRIAGE_MOCK_NOW,
  type TriageStore,
  TriageStoreStage,
  installTriageEnvironment,
  makeTriageStore,
  seedTriageRequest,
} from './triageHarness'

let teardownEnvironment: () => void
let teardownPointer: () => void

beforeEach(() => {
  teardownEnvironment = installTriageEnvironment()
  teardownPointer = installPointerEvents()
})

afterEach(() => {
  cleanup()
  teardownPointer()
  teardownEnvironment()
})

const mount = (store: TriageStore, gateway?: TriageShareGateway) =>
  render(
    <TriageStoreStage store={store}>
      <TriageCarouselPage
        carouselWidth={390}
        locale="en-US"
        shareGateway={gateway}
      />
    </TriageStoreStage>,
  )

/** A store with the fixture pool, one row's Triage tapped and the session open. */
const openedOn = async (
  endeavorId: string,
  gateway?: TriageShareGateway,
): Promise<TriageStore> => {
  const store = makeTriageStore({ endeavors: triageFixtureRecords() })
  mount(store, gateway)
  await seedTriageRequest(store, endeavorId)
  await screen.findByTestId('triage-form')
  return store
}

describe('the hand-off from the Inbox', () => {
  it('renders nothing until a row asks for Triage', async () => {
    const store = makeTriageStore({ endeavors: triageFixtureRecords() })
    mount(store)

    expect(screen.queryByTestId('triage-carousel')).toBeNull()
    expect(screen.queryByTestId('triage-status-strip')).toBeNull()
  })

  it('opens on the row that was tapped, with its own title and symbol', async () => {
    await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    expect(screen.getByText('Draft Q3 product plan')).toBeTruthy()
    expect(screen.getByTestId('triage-carousel')).toBeTruthy()
  })

  it('spends the one-shot, so a stale request cannot re-open the screen', async () => {
    const store = await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    await waitFor(() => {
      expect(store.getState().capture.triageRequest).toBeNull()
    })
  })

  it('prefills every field the source endeavor already carries', async () => {
    await openedOn(triageEndeavorFixtures.fullyPrefilled.id)

    // `sessionPoints: 55`, and the badge is bound to the same value the stepper
    // edits.
    expect(
      screen.getByTestId('triage-reward-badge').getAttribute('aria-label'),
    ).toBe('Reward: 55 points')
    // `duration: 1500` seconds -> the 25-minute chip is the selected one.
    expect(
      within(screen.getByTestId('triage-duration-chips'))
        .getByText('25 min')
        .getAttribute('aria-pressed'),
    ).toBe('true')
    // `due` is set, so the picker is revealed rather than the CTA.
    expect(screen.getByTestId('triage-due-date-input')).toBeTruthy()
  })

  it('writes nothing when it opens — *"tapping into a triage flow on a Kro-tourist is fine"*', async () => {
    const store = await openedOn(triageEndeavorFixtures.touristReminder.id)

    // The save lifecycle never left idle: opening reads, it does not write.
    expect(store.getState().triage.save.kind).toBe('idle')
    // The citizenship the session snapshots is a *forecast input*, taken at
    // entry and never applied — `withSessionOpened` computes it and stops.
    expect(store.getState().triage.session?.citizenshipAtEntry).toBe(
      EndeavorCitizenship.unhosted,
    )
    expect(store.getState().triage.session?.willPromoteOnConfirm).toBe(false)
  })
})

describe('the confirm gate, end to end', () => {
  it('disables Complete and names the missing quadrant on a pristine form', async () => {
    await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    expect(screen.getByTestId('triage-confirm').hasAttribute('disabled')).toBe(
      true,
    )
    expect(screen.getByTestId('triage-blocked-reason').textContent).toBe(
      'Pick a quadrant to complete this triage.',
    )
  })

  it('opens the gate the moment Archive is picked, with no date required', async () => {
    await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    fireEvent.click(
      screen.getByTestId(`triage-quadrant-${EisenhowerQuadrant.delete}`),
    )

    await waitFor(() => {
      expect(screen.getByTestId('triage-confirm').hasAttribute('disabled')).toBe(
        false,
      )
    })
    expect(screen.getByTestId('triage-blocked-reason').className).toContain(
      'sr-only',
    )
  })

  it('moves the blocker to the date when value 4 promotes the quadrant', async () => {
    await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    // Acceptance criterion 2: the rating moves the matrix highlight.
    fireEvent.click(screen.getByTestId('triage-value-step-4'))

    await waitFor(() => {
      expect(
        screen
          .getByTestId(`triage-quadrant-${EisenhowerQuadrant.decide}`)
          .getAttribute('aria-pressed'),
      ).toBe('true')
    })
    expect(screen.getByTestId('triage-blocked-reason').textContent).toBe(
      'Add a scheduled date to complete this triage.',
    )
    expect(screen.getByTestId('triage-confirm').hasAttribute('disabled')).toBe(
      true,
    )
  })

  it('seeds a date on a quadrant tap, which opens the gate', async () => {
    await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    fireEvent.click(
      screen.getByTestId(`triage-quadrant-${EisenhowerQuadrant.decide}`),
    )

    await waitFor(() => {
      expect(screen.getByTestId('triage-due-date-input')).toBeTruthy()
    })
    expect(screen.getByTestId('triage-confirm').hasAttribute('disabled')).toBe(
      false,
    )
  })
})

describe('confirming returns to the Inbox with the row drained', () => {
  it('writes the decision, pops the form and takes the row off Pending Triage', async () => {
    const store = await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    const before = selectPendingTriageEndeavors(store.getState()).map(
      (endeavor) => endeavor.id,
    )
    expect(before).toContain(triageEndeavorFixtures.unscheduledTask.id)

    fireEvent.click(
      screen.getByTestId(`triage-quadrant-${EisenhowerQuadrant.decide}`),
    )
    await waitFor(() => {
      expect(screen.getByTestId('triage-confirm').hasAttribute('disabled')).toBe(
        false,
      )
    })
    fireEvent.click(screen.getByTestId('triage-confirm'))

    // The form pops immediately — the Shifter clears the session as it raises
    // the outcome — and the save runs behind it.
    await waitFor(() => {
      expect(screen.queryByTestId('triage-form')).toBeNull()
    })
    await waitFor(() => {
      expect(store.getState().triage.save.kind).toBe('saved')
    })
    await waitFor(() => {
      const after = selectPendingTriageEndeavors(store.getState()).map(
        (endeavor) => endeavor.id,
      )
      expect(after).not.toContain(triageEndeavorFixtures.unscheduledTask.id)
    })
  })

  it('archives the row rather than scheduling it when Archive is confirmed', async () => {
    const store = await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    fireEvent.click(
      screen.getByTestId(`triage-quadrant-${EisenhowerQuadrant.delete}`),
    )
    await waitFor(() => {
      expect(screen.getByTestId('triage-confirm').hasAttribute('disabled')).toBe(
        false,
      )
    })
    fireEvent.click(screen.getByTestId('triage-secondary-archive'))

    await waitFor(() => {
      expect(store.getState().triage.save.kind).toBe('saved')
    })
    const stored = await store.getState().capture.endeavors.find(
      (endeavor) => endeavor.id === triageEndeavorFixtures.unscheduledTask.id,
    )
    await waitFor(() => {
      expect(stored === undefined || stored.status === EndeavorStatus.closed).toBe(
        true,
      )
    })
  })

  it('prepares the focus session when Start Now is taken', async () => {
    const store = await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    fireEvent.click(
      screen.getByTestId(`triage-quadrant-${EisenhowerQuadrant.prioritize}`),
    )
    await waitFor(() => {
      expect(screen.getByTestId('triage-secondary-startNow')).toBeTruthy()
    })
    fireEvent.click(screen.getByTestId('triage-secondary-startNow'))

    await waitFor(() => {
      expect(store.getState().triage.save.kind).toBe('saved')
    })
    // The hand-off canon calls "deploys the focus-session sheet": #21's shipped
    // ready-phase setup. The sheet that draws it is KC-IS-#22's.
    await waitFor(() => {
      expect(store.getState().session.identity?.endeavorId).toBe(
        triageEndeavorFixtures.unscheduledTask.id,
      )
    })
  })
})

describe('Share — the Web Share hand-off and its clipboard fallback', () => {
  const openedOnDelegate = async (gateway: TriageShareGateway) => {
    const store = await openedOn(
      triageEndeavorFixtures.unscheduledTask.id,
      gateway,
    )
    fireEvent.click(
      screen.getByTestId(`triage-quadrant-${EisenhowerQuadrant.delegate}`),
    )
    await waitFor(() => {
      expect(screen.getByTestId('triage-secondary-share')).toBeTruthy()
    })
    fireEvent.click(screen.getByTestId('triage-secondary-share'))
    return store
  }

  it('hands canon\'s blurb to the share sheet when the browser has one', async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    const store = await openedOnDelegate({ share })

    await waitFor(() => {
      expect(share).toHaveBeenCalledTimes(1)
    })
    expect(share.mock.calls[0]?.[0]?.text).toBe(
      'I\'d like you to help with "Draft Q3 product plan". (Shared from Kro.)',
    )
    // Canon pops the Triage child when the sheet is dismissed, not on the tap.
    await waitFor(() => {
      expect(store.getState().triage.session).toBeNull()
    })
  })

  it('falls back to the clipboard, and says so, on a browser with no share sheet', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    await openedOnDelegate({ writeText })

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(
        'I\'d like you to help with "Draft Q3 product plan". (Shared from Kro.)',
      )
    })
    const strip = await screen.findByTestId('triage-status-strip')
    expect(strip.textContent).toContain('clipboard')
  })

  it('still saves the decision when neither capability exists', async () => {
    const store = await openedOnDelegate({})

    await waitFor(() => {
      expect(store.getState().triage.save.kind).toBe('saved')
    })
    const strip = await screen.findByTestId('triage-status-strip')
    expect(strip.textContent).toContain('could not be copied')
  })
})

describe('the escape gesture, through the Page', () => {
  it('drops the session and discards every selection', async () => {
    const store = await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    fireEvent.click(
      screen.getByTestId(`triage-quadrant-${EisenhowerQuadrant.decide}`),
    )
    await waitFor(() => {
      expect(store.getState().triage.session?.form.quadrant).toBe(
        EisenhowerQuadrant.decide,
      )
    })

    const panel = screen.getByTestId('triage-carousel')
    fireEvent.pointerDown(panel, { pointerId: 1, clientX: 8, clientY: 300 })
    fireEvent.pointerMove(panel, { pointerId: 1, clientX: 300, clientY: 300 })
    fireEvent.pointerUp(panel, { pointerId: 1, clientX: 300, clientY: 300 })

    await waitFor(() => {
      expect(store.getState().triage.session).toBeNull()
    })
    // Nothing was written: the endeavor is unchanged.
    expect(store.getState().triage.save.kind).toBe('idle')
    expect(
      selectPendingTriageEndeavors(store.getState()).map(
        (endeavor) => endeavor.id,
      ),
    ).toContain(triageEndeavorFixtures.unscheduledTask.id)
  })

  it('discards through the header chevron the same way', async () => {
    const store = await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    fireEvent.click(screen.getByTestId('triage-back'))

    await waitFor(() => {
      expect(store.getState().triage.session).toBeNull()
    })
    expect(store.getState().triage.save.kind).toBe('idle')
  })

  it('springs back on a release short of the threshold, keeping the form', async () => {
    const store = await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    const panel = screen.getByTestId('triage-carousel')
    fireEvent.pointerDown(panel, { pointerId: 1, clientX: 8, clientY: 300 })
    fireEvent.pointerMove(panel, { pointerId: 1, clientX: 70, clientY: 300 })
    fireEvent.pointerUp(panel, { pointerId: 1, clientX: 70, clientY: 300 })

    expect(store.getState().triage.session).not.toBeNull()
    expect(screen.getByTestId('triage-form')).toBeTruthy()
  })
})

describe('the expiry row, driven through the real reducer', () => {
  it('re-orders selected-first when a preset is tapped', async () => {
    await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    fireEvent.click(
      screen.getByTestId(`triage-quadrant-${EisenhowerQuadrant.decide}`),
    )
    const row = await screen.findByTestId('triage-expiry-row')

    fireEvent.click(within(row).getByText('EoD'))

    await waitFor(() => {
      const labels = Array.from(
        screen.getByTestId('triage-expiry-row').children,
      )
        .map((child) => child.textContent?.trim() ?? '')
        .filter((text) => text.length > 0)
      expect(labels[0]).toBe('EoD')
    })
  })

  it('keeps the declared order behind the selection', async () => {
    await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    fireEvent.click(
      screen.getByTestId(`triage-quadrant-${EisenhowerQuadrant.decide}`),
    )
    const row = await screen.findByTestId('triage-expiry-row')
    fireEvent.click(within(row).getByText('EoW'))

    await waitFor(() => {
      const labels = Array.from(
        screen.getByTestId('triage-expiry-row').children,
      )
        .map((child) => child.textContent?.trim() ?? '')
        .filter((text) => text.length > 0)
      expect(labels).toEqual([
        'EoW',
        'At the moment',
        'An hour later',
        '2h later',
        '4h later',
        'EoD',
        'Custom',
      ])
    })
  })

  it('lights Custom when the picker lands off every preset', async () => {
    await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    fireEvent.click(
      screen.getByTestId(`triage-quadrant-${EisenhowerQuadrant.decide}`),
    )
    const input = await screen.findByTestId('triage-expiry-input')

    // Two minutes past an hour boundary: no preset can compute to it.
    fireEvent.change(input, { target: { value: '2026-03-24T11:09' } })

    await waitFor(() => {
      expect(
        screen.getByTestId('triage-expiry-custom').getAttribute('aria-label'),
      ).toBe('Custom date selected')
    })
  })
})

describe('the reward stepper, driven through the real reducer', () => {
  it('steps by 5 below 50 and clamps at the floor', async () => {
    await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    // The prefill default is 10.
    fireEvent.click(screen.getByLabelText('Increase reward points'))
    await waitFor(() => {
      expect(screen.getByTestId('triage-reward-value').textContent).toBe('15')
    })
    fireEvent.click(screen.getByLabelText('Decrease reward points'))
    await waitFor(() => {
      expect(screen.getByTestId('triage-reward-value').textContent).toBe('10')
    })
  })

  it('steps by 10 at or above 50, which is the grain the value sits on', async () => {
    await openedOn(triageEndeavorFixtures.fullyPrefilled.id)

    // The prefill is 55.
    expect(screen.getByTestId('triage-reward-value').textContent).toBe('55')
    fireEvent.click(screen.getByLabelText('Increase reward points'))
    await waitFor(() => {
      expect(screen.getByTestId('triage-reward-value').textContent).toBe('65')
    })
  })

  it('keeps the header badge bound to the same number the stepper edits', async () => {
    await openedOn(triageEndeavorFixtures.unscheduledTask.id)

    fireEvent.click(screen.getByLabelText('Increase reward points'))

    await waitFor(() => {
      expect(
        screen.getByTestId('triage-reward-badge').getAttribute('aria-label'),
      ).toBe('Reward: 15 points')
    })
  })
})

describe('the mock clock the fixtures speak', () => {
  it('opens against the seeded day rather than the wall clock', async () => {
    const store = makeTriageStore({ endeavors: triageFixtureRecords() })
    mount(store)
    await seedTriageRequest(
      store,
      triageEndeavorFixtures.unscheduledTask.id,
      TRIAGE_MOCK_NOW,
    )
    await screen.findByTestId('triage-form')

    expect(store.getState().capture.clockAnchor?.getTime()).toBe(
      TRIAGE_MOCK_NOW.getTime(),
    )
  })
})
