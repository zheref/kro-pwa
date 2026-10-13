/**
 * `@kro/app/design` marketing primitives — the landing page's building blocks.
 * Domain-less (`RC-14`): props and callbacks only, no store, no slice.
 * Styles live in `marketing.css`, imported by `system/styles.css`.
 */
export {
  BackToTop,
  BACK_TO_TOP_THRESHOLD,
  type BackToTopProps,
} from './BackToTop'
export {
  FeatureCard,
  type FeatureCardProps,
} from './FeatureCard'
export {
  GlassCta,
  type CtaAction,
  type GlassCtaProps,
} from './GlassCta'
export {
  MacWindowFrame,
  type MacWindowFrameProps,
} from './MacWindowFrame'
export {
  MarketingFooter,
  type FooterColumn,
  type FooterLink,
  type MarketingFooterProps,
} from './MarketingFooter'
export {
  MarketingNav,
  NAV_SCROLL_THRESHOLD,
  type MarketingNavProps,
  type NavLink,
} from './MarketingNav'
export {
  MarketingSection,
  type MarketingSectionProps,
  type MarketingTone,
  type MarketingWidth,
} from './MarketingSection'
export { PhoneFrame, type PhoneFrameProps } from './PhoneFrame'
export {
  PLATFORM_STATUS_TEXT,
  PlatformBadge,
  type PlatformBadgeProps,
  type PlatformStatus,
} from './PlatformBadge'
export { Reveal, type RevealProps } from './Reveal'
export { SectionHeader, type SectionHeaderProps } from './SectionHeader'
export { StatRow, type StatItem, type StatRowProps } from './StatRow'
export {
  ThemeToggle,
  type ThemeToggleProps,
  type ThemeValue,
} from './ThemeToggle'
export { WatchFrame, type WatchFrameProps } from './WatchFrame'
export { useActiveSection } from './useActiveSection'
