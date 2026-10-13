import { Reveal } from './Reveal'
import { MarketingStage } from './marketingStage'

export default {
  title: 'Marketing/Reveal',
  component: Reveal,
  parameters: { layout: 'fullscreen' },
}

const Card = ({ n }: { readonly n: number }) => (
  <p
    style={{
      margin: 0,
      padding: 24,
      borderRadius: 'var(--kro-radius-surface)',
      background: 'var(--kro-color-absolute)',
      boxShadow: 'var(--kro-shadow-subtle)',
    }}
  >
    Card {n}
  </p>
)

export const OnScreen = {
  name: 'Above the fold · stays visible, never flickers',
  render: () => (
    <MarketingStage>
      <div style={{ padding: 24 }}>
        <Reveal>
          <Card n={1} />
        </Reveal>
      </div>
    </MarketingStage>
  ),
}

export const Staggered = {
  name: 'Staggered · delay per sibling',
  render: () => (
    <MarketingStage>
      <div style={{ display: 'grid', gap: 12, padding: 24 }}>
        {[0, 1, 2].map((n) => (
          <Reveal key={n} delay={n * 80}>
            <Card n={n + 1} />
          </Reveal>
        ))}
      </div>
    </MarketingStage>
  ),
}

export const AsListItems = {
  name: 'As list items · in dark',
  render: () => (
    <MarketingStage theme="dark">
      <ul
        style={{
          display: 'grid',
          gap: 12,
          padding: 24,
          margin: 0,
          listStyle: 'none',
        }}
      >
        {[1, 2].map((n) => (
          <Reveal key={n} as="li" delay={n * 60}>
            <Card n={n} />
          </Reveal>
        ))}
      </ul>
    </MarketingStage>
  ),
}
