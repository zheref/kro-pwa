/** The footer: product anchors, the open-source link, trust, and the legal line. */
import { MarketingFooter } from '../../../../design/marketing'
import { LANDING_BRAND, footerCopy } from '../../LandingCopy'
import { LANDING_SECTION_IDS, sectionHref } from '../../LandingSections'

export interface LandingFooterProps {
  readonly onOutbound: (href: string) => void
}

export function LandingFooter({ onOutbound }: LandingFooterProps) {
  return (
    <>
      {/* The footer primitive renders plain anchors; an outbound press is
          caught here by delegation so the primitive stays store-free. */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: a keyboard press on an anchor bubbles here as a click. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: delegation only — the anchors inside are the interactive, keyboard-reachable elements. */}
      <div
        onClick={(event) => {
          const anchor = (event.target as HTMLElement).closest('a')
          const href = anchor?.getAttribute('href') ?? ''
          if (/^https?:\/\//.test(href)) onOutbound(href)
        }}
      >
        <MarketingFooter
          brand={{ label: LANDING_BRAND, tagline: 'Plan · Do · Earn' }}
          columns={[
            {
              title: 'Product',
              links: [
                {
                  label: 'The loop',
                  href: sectionHref(LANDING_SECTION_IDS.loop),
                },
                {
                  label: 'Sessions',
                  href: sectionHref(LANDING_SECTION_IDS.focus),
                },
                {
                  label: 'Platforms',
                  href: sectionHref(LANDING_SECTION_IDS.platforms),
                },
                {
                  label: 'Early access',
                  href: sectionHref(LANDING_SECTION_IDS.earlyAccess),
                },
              ],
            },
            {
              title: 'Open source',
              links: [
                {
                  label: 'Kro for Web on GitHub',
                  href: footerCopy.repo,
                  external: true,
                },
              ],
            },
            {
              title: 'Trust',
              links: [
                {
                  label: 'Privacy',
                  href: sectionHref(LANDING_SECTION_IDS.privacy),
                },
              ],
            },
          ]}
          legal={footerCopy.legal}
        />
      </div>
    </>
  )
}
