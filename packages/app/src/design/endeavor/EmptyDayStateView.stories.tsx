/**
 * The two full-surface empty states.
 *
 * `EmptyDayStateView` belongs on the page field — on-gradient ink, no inset
 * well, a KroGlass Create control — so the stories put it on `DetailBackdrop`
 * at a real content height. `InboxTrayEmptyState` belongs under a pinned
 * header, which the tray story supplies so the vertical centring can be judged.
 */

import type { ReactNode } from 'react'
import { DetailBackdrop } from '../system/gradient/DetailBackdrop'
import { CompactPresentationHeader } from './CompactPresentationHeader'
import { EmptyDayStateView, InboxTrayEmptyState } from './EmptyDayStateView'
import { BothSchemes, Stage } from './storyStage'
import { StoryGallery } from '../storybook/storyGallery'

export default {
  title: 'Endeavor/Empty states',
  component: EmptyDayStateView,
  parameters: { layout: 'fullscreen' },
}

function Field({
  theme = 'light',
  height = '100%',
  children,
}: {
  readonly theme?: 'light' | 'dark'
  readonly height?: number | string
  readonly children: ReactNode
}) {
  return (
    <div
      data-theme={theme}
      style={{
        position: 'relative',
        display: 'flex',
        height,
        minHeight: typeof height === 'number' ? height : 560,
      }}
    >
      <DetailBackdrop />
      <div
        style={{
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          flex: 1,
          width: '100%',
          minHeight: 0,
        }}
      >
        {children}
      </div>
    </div>
  )
}

const DoPromotion = {
  name: 'Do tab · centred on the page field',
  render: () => (
    <Field>
      <EmptyDayStateView onCreateEndeavor={() => undefined} />
    </Field>
  ),
}

const PromotionWithoutAction = {
  name: 'Do tab · read-only, no CTA',
  render: () => (
    <Field>
      <EmptyDayStateView
        title="Nothing scheduled"
        message="Your day is clear. Connect a calendar to see what is already booked."
      />
    </Field>
  ),
}

const BothSchemesOnField = {
  name: 'Do tab · both schemes, centred',
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      <Field theme="light" height={480}>
        <EmptyDayStateView onCreateEndeavor={() => undefined} />
      </Field>
      <Field theme="dark" height={480}>
        <EmptyDayStateView onCreateEndeavor={() => undefined} />
      </Field>
    </div>
  ),
}

const InboxTray = {
  name: 'Inbox tray · pinned header, centred illustration',
  render: () => (
    <Stage>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: 380,
          height: 440,
          overflow: 'hidden',
          borderRadius: 'var(--kro-radius-surface)',
          background: 'var(--kro-color-absolute)',
          boxShadow: 'var(--kro-shadow-card)',
        }}
      >
        <CompactPresentationHeader
          title="Inbox"
          subtitle="0 endeavors"
          leadingAction={{ kind: 'dismiss', onPress: () => undefined }}
        />
        <InboxTrayEmptyState />
      </div>
    </Stage>
  ),
}

const BothThemes = {
  name: 'Inbox tray · both schemes',
  render: () => (
    <BothSchemes>
      <div style={{ display: 'flex', height: 260, width: '100%' }}>
        <InboxTrayEmptyState />
      </div>
    </BothSchemes>
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {DoPromotion.render()}
      {PromotionWithoutAction.render()}
      {BothSchemesOnField.render()}
      {InboxTray.render()}
      {BothThemes.render()}
    </StoryGallery>
  ),
}
