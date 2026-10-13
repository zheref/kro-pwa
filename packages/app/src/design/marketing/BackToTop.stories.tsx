import { BackToTop } from './BackToTop'
import { MarketingStage } from './marketingStage'

export default {
  title: 'Marketing/BackToTop',
  component: BackToTop,
  parameters: { layout: 'fullscreen' },
}

const Tall = ({ children }: { readonly children: React.ReactNode }) => (
  <div style={{ height: '220vh', padding: 24 }}>
    <p>Scroll down: the disc appears after 80% of a viewport.</p>
    {children}
  </div>
)

export const Light = {
  name: 'Light · hidden at the top, appears on scroll',
  render: () => (
    <MarketingStage>
      <Tall>
        <BackToTop />
      </Tall>
    </MarketingStage>
  ),
}

export const Dark = {
  name: 'Dark',
  render: () => (
    <MarketingStage theme="dark">
      <Tall>
        <BackToTop />
      </Tall>
    </MarketingStage>
  ),
}

export const CustomLabel = {
  name: 'Custom label · localised name',
  render: () => (
    <MarketingStage idiom="mobile" width={390}>
      <Tall>
        <BackToTop label="Volver arriba" />
      </Tall>
    </MarketingStage>
  ),
}
