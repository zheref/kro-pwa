import type { ReactNode } from 'react'
import { Stage } from '../../design/endeavor/storyStage'
import { ComingSoonFragment } from './ComingSoonFragment'

/**
 * The Thirst "Available soon — vote to get it sooner" surface — canon's
 * `ComingSoonView.swift` previews, ported. Every state (`ThirstVoteStatus`)
 * mirrors `ComingSoonFragment.test.tsx` 1:1.
 */
export default {
  title: 'Thirst/Coming soon',
  component: ComingSoonFragment,
  parameters: { layout: 'fullscreen' },
}

function Frame({ children }: { readonly children: ReactNode }) {
  return (
    <div style={{ height: 480, width: 420 }}>
      <Stage>{children}</Stage>
    </div>
  )
}

export const Votable = {
  render: () => (
    <Frame>
      <ComingSoonFragment
        featureTitle="Priority Matrix"
        featureBlurb="Sort what matters by urgency and importance."
        status={{ kind: 'votable' }}
        hasCounts
        totalCount={42}
        perPlatform={[
          { platform: 'ios', count: 30 },
          { platform: 'android', count: 12 },
        ]}
        isVoting={false}
      />
    </Frame>
  ),
}

export const Voted = {
  render: () => (
    <Frame>
      <ComingSoonFragment
        featureTitle="Habits"
        featureBlurb="Build routines and keep your streaks alive."
        status={{ kind: 'voted' }}
        hasCounts
        totalCount={43}
        perPlatform={[
          { platform: 'ios', count: 31 },
          { platform: 'android', count: 12 },
        ]}
        isVoting={false}
      />
    </Frame>
  ),
}

export const Loading = {
  render: () => (
    <Frame>
      <ComingSoonFragment
        featureTitle="Board"
        featureBlurb="Organize your work on a flexible board."
        status={{ kind: 'loading' }}
        hasCounts={false}
        totalCount={0}
        perPlatform={[]}
        isVoting={false}
      />
    </Frame>
  ),
}

export const UnavailableSignedOut = {
  render: () => (
    <Frame>
      <ComingSoonFragment
        featureTitle="Blueprints"
        featureBlurb="Reusable templates to start endeavors faster."
        status={{ kind: 'unavailable', message: 'Sign in to vote for upcoming features.' }}
        hasCounts
        totalCount={17}
        perPlatform={[{ platform: 'ios', count: 17 }]}
        isVoting={false}
      />
    </Frame>
  ),
}

export const UnavailableOfflineNoCounts = {
  render: () => (
    <Frame>
      <ComingSoonFragment
        featureTitle="Blueprints"
        featureBlurb="Reusable templates to start endeavors faster."
        status={{ kind: 'unavailable', message: 'No internet connection. Please try again.' }}
        hasCounts={false}
        totalCount={0}
        perPlatform={[]}
        isVoting={false}
      />
    </Frame>
  ),
}

export const NotVotable = {
  render: () => (
    <Frame>
      <ComingSoonFragment
        featureTitle="Unknown"
        status={{ kind: 'notVotable' }}
        hasCounts={false}
        totalCount={0}
        perPlatform={[]}
        isVoting={false}
      />
    </Frame>
  ),
}

export const VotingInFlight = {
  render: () => (
    <Frame>
      <ComingSoonFragment
        featureTitle="Priority Matrix"
        featureBlurb="Sort what matters by urgency and importance."
        status={{ kind: 'votable' }}
        hasCounts
        totalCount={42}
        perPlatform={[{ platform: 'ios', count: 42 }]}
        isVoting
      />
    </Frame>
  ),
}

export const BothSchemes = {
  render: () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
      {(['light', 'dark'] as const).map((theme) => (
        <div key={theme} style={{ height: 480 }}>
          <Stage theme={theme}>
            <ComingSoonFragment
              featureTitle="Priority Matrix"
              featureBlurb="Sort what matters by urgency and importance."
              status={{ kind: 'votable' }}
              hasCounts
              totalCount={42}
              perPlatform={[
                { platform: 'ios', count: 30 },
                { platform: 'android', count: 12 },
              ]}
              isVoting={false}
            />
          </Stage>
        </div>
      ))}
    </div>
  ),
}
