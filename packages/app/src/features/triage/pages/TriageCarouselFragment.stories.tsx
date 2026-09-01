/**
 * The carousel layer, over a stand-in Inbox list.
 *
 * The stories exist to show the three things a still image can show about a
 * gesture-driven surface: where the panel sits when it is presented, where the
 * 72px edge strip is, and what the surface shows once the panel has gone and
 * the durable save is still running. The gesture's own two sides are proved by
 * `__tests__/TriageCarouselFragment.test.tsx` and by the pure functions in
 * `triagePresentation.ts`.
 *
 * `__tests__/TriageCarouselFragment.test.tsx` mirrors this set (`RC-11`).
 */

import { TriageCarouselFragment } from './TriageCarouselFragment'
import { TriageFormFragment } from './TriageFormFragment'
import { triageStateMocks } from '../TriageMocks'
import {
  ThemeScope,
  triageFormProps,
  triagePageStateMocks,
} from './__tests__/triageHarness'

export default {
  title: 'Triage/Carousel',
  component: TriageCarouselFragment,
  parameters: { layout: 'fullscreen' },
}

const noop = () => {}

/** A stand-in for the Inbox list the carousel mounts over. */
function InboxStandIn() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 20,
        height: '100%',
        background: 'var(--kro-color-back)',
      }}
    >
      <p style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Inbox</p>
      {[
        'Draft Q3 product plan',
        'Call the letting agent',
        'Renew the domain',
      ].map((title) => (
        <div
          key={title}
          style={{
            padding: 12,
            borderRadius: 'var(--kro-radius-card)',
            background: 'var(--kro-color-back-inner)',
          }}
        >
          {title}
        </div>
      ))}
    </div>
  )
}

const surface = (
  children: React.ReactNode,
  theme: 'light' | 'dark' = 'light',
) => (
  <ThemeScope theme={theme}>
    <div
      style={{
        position: 'relative',
        width: 390,
        height: 720,
        overflow: 'hidden',
        border: '1px solid var(--kro-color-hairline)',
        borderRadius: 'var(--kro-radius-surface)',
      }}
    >
      <InboxStandIn />
      {children}
    </div>
  </ThemeScope>
)

/** Nothing to present: the Inbox list is untouched. */
export const Closed = {
  render: () =>
    surface(
      <TriageCarouselFragment
        isPresenting={false}
        onDismiss={noop}
        carouselWidth={390}
      >
        {null}
      </TriageCarouselFragment>,
    ),
}

/** Presented, over the list — canon's carousel position with the drag at rest. */
export const Presented = {
  render: () =>
    surface(
      <TriageCarouselFragment isPresenting onDismiss={noop} carouselWidth={390}>
        <TriageFormFragment {...triageFormProps(triageStateMocks.scheduled)} />
      </TriageCarouselFragment>,
    ),
}

/** The same, dark. */
export const PresentedDark = {
  render: () =>
    surface(
      <TriageCarouselFragment isPresenting onDismiss={noop} carouselWidth={390}>
        <TriageFormFragment
          {...triageFormProps(triagePageStateMocks.delegatePicked)}
        />
      </TriageCarouselFragment>,
      'dark',
    ),
}

/** The durable save, after the form has already popped. */
export const SavingAfterConfirm = {
  render: () =>
    surface(
      <TriageCarouselFragment
        isPresenting={false}
        onDismiss={noop}
        isSaving
        carouselWidth={390}
      >
        {null}
      </TriageCarouselFragment>,
    ),
}

/** The local save failed — the one case the decision was not captured. */
export const SaveFailedStrip = {
  render: () =>
    surface(
      <TriageCarouselFragment
        isPresenting={false}
        onDismiss={noop}
        saveExceptionMessage="Couldn't save your triage decision: QuotaExceededError"
        carouselWidth={390}
      >
        {null}
      </TriageCarouselFragment>,
    ),
}

/** A push that did not land, and a share that fell back to the clipboard. */
export const NoticeStrip = {
  render: () =>
    surface(
      <TriageCarouselFragment
        isPresenting={false}
        onDismiss={noop}
        notice="Sharing is unavailable here, so the message was copied to your clipboard."
        carouselWidth={390}
      >
        {null}
      </TriageCarouselFragment>,
    ),
}
