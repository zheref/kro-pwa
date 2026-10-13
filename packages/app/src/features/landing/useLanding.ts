/**
 * The headless half of the landing Page (`UZF-4`, `RC-10`, `RC-15`).
 *
 * Dispatches intent through the typed hooks, reads through named Selectors and
 * hands the Fragment a view model plus callbacks. It holds NO `useState`; the
 * only local memory is a `useRef` that makes `page_view` fire once.
 *
 * Analytics is counts and timings only. Every event is dispatched as a
 * Producer, never called from here.
 */
import type { KroPlatform } from '@kro/core'
import { useCallback, useEffect, useRef } from 'react'
import { resolveTheme } from '../../design'
import { useActiveSection } from '../../design/marketing'
import { useAppDispatch, useAppSelector } from '../../library/hooks'
import { faqEntries } from './LandingCopy'
import {
  type LandingTheme,
  type PlatformRequest,
  onSectionViewed,
  onViewLoaded,
  userDidCloseFaq,
  userDidFollowNavLink,
  userDidOpenFaq,
  userDidOpenNav,
  userDidRequestPlatform,
} from './LandingFeature'
import {
  type CtaPlacement,
  onSectionEnteredThunk,
  trackLandingEventThunk,
  userDidTapCtaThunk,
  userDidToggleThemeThunk,
  userDidVotePlatformThunk,
} from './LandingProducer'
import { scrollToSection } from './LandingScroll'
import {
  selectActiveSectionId,
  selectFaqOpenId,
  selectPlatformRequest,
  selectTheme,
} from './LandingSelectors'
import { LANDING_OBSERVED_IDS, LANDING_SECTION_IDS } from './LandingSections'

export interface LandingViewModel {
  readonly activeSectionId: string | null
  readonly faqOpenId: string | null
  readonly theme: LandingTheme
  readonly hubUrl: string
  /** The latest platform asked for; the early-access form reacts to it. */
  readonly platformRequest: PlatformRequest | null
  readonly onToggleTheme: () => void
  readonly onOpenHub: (placement: CtaPlacement) => void
  readonly onGetEarlyAccess: (placement: CtaPlacement) => void
  readonly onPickPlatform: (platform: KroPlatform) => void
  readonly onVotePlatform: (platform: KroPlatform) => void
  readonly onFaqOpen: (id: string) => void
  readonly onFaqClose: () => void
  readonly onOutbound: (href: string) => void
  readonly onNavigate: (href: string) => void
  readonly onOpenMenu: () => void
}

const hostOf = (href: string): string => {
  try {
    return new URL(href).host
  } catch {
    return 'unknown'
  }
}

export function useLanding(hubUrl: string): LandingViewModel {
  const dispatch = useAppDispatch()
  const activeSectionId = useAppSelector(selectActiveSectionId)
  const faqOpenId = useAppSelector(selectFaqOpenId)
  const theme = useAppSelector(selectTheme)
  const platformRequest = useAppSelector(selectPlatformRequest)
  const viewed = useRef(false)

  // Mount: stamp the resolved theme and hub link, and count one page view.
  useEffect(() => {
    dispatch(onViewLoaded({ theme: resolveTheme(), hubUrl }))
    if (viewed.current) return
    viewed.current = true
    void dispatch(
      trackLandingEventThunk({
        name: 'page_view',
        props: { path: window.location.pathname },
      }),
    )
  }, [dispatch, hubUrl])

  // The section crossing the middle of the viewport. The Producer is
  // dispatched BEFORE the reducer so its dedupe reads the ids viewed so far.
  const observed = useActiveSection(LANDING_OBSERVED_IDS)
  useEffect(() => {
    if (observed === null) return
    void dispatch(onSectionEnteredThunk({ id: observed }))
    dispatch(onSectionViewed({ id: observed }))
  }, [dispatch, observed])

  const onToggleTheme = useCallback(() => {
    void dispatch(userDidToggleThemeThunk())
  }, [dispatch])

  const onOpenHub = useCallback(
    (placement: CtaPlacement) => {
      void dispatch(userDidTapCtaThunk({ placement, target: 'hub' }))
    },
    [dispatch],
  )

  const onGetEarlyAccess = useCallback(
    (placement: CtaPlacement) => {
      void dispatch(userDidTapCtaThunk({ placement, target: 'early-access' }))
    },
    [dispatch],
  )

  const goToForm = useCallback(() => {
    scrollToSection(LANDING_SECTION_IDS.earlyAccess, 'input[name="email"]')
  }, [])

  const onPickPlatform = useCallback(
    (platform: KroPlatform) => {
      dispatch(userDidRequestPlatform({ platform }))
      void dispatch(
        userDidTapCtaThunk({ placement: 'platforms', target: 'early-access' }),
      )
      goToForm()
    },
    [dispatch, goToForm],
  )

  const onVotePlatform = useCallback(
    (platform: KroPlatform) => {
      void dispatch(userDidVotePlatformThunk({ platform }))
      dispatch(userDidRequestPlatform({ platform }))
      goToForm()
    },
    [dispatch, goToForm],
  )

  const onFaqOpen = useCallback(
    (id: string) => {
      dispatch(userDidOpenFaq({ id }))
      void dispatch(
        trackLandingEventThunk({
          name: 'faq_open',
          props: { question: faqEntries.findIndex((entry) => entry.id === id) },
        }),
      )
    },
    [dispatch],
  )

  const onFaqClose = useCallback(() => {
    dispatch(userDidCloseFaq())
  }, [dispatch])

  const onOutbound = useCallback(
    (href: string) => {
      void dispatch(
        trackLandingEventThunk({
          name: 'outbound',
          props: { destination: hostOf(href) },
        }),
      )
    },
    [dispatch],
  )

  const onOpenMenu = useCallback(() => {
    dispatch(userDidOpenNav())
    void dispatch(trackLandingEventThunk({ name: 'nav_open' }))
  }, [dispatch])

  // Following a link closes the menu (the primitive does that itself); keep
  // the slice in step. An Escape close cannot be seen and self-heals here.
  const onNavigate = useCallback(() => {
    dispatch(userDidFollowNavLink())
  }, [dispatch])

  return {
    activeSectionId,
    faqOpenId,
    theme,
    hubUrl,
    platformRequest,
    onToggleTheme,
    onOpenHub,
    onGetEarlyAccess,
    onPickPlatform,
    onVotePlatform,
    onFaqOpen,
    onFaqClose,
    onOutbound,
    onNavigate,
    onOpenMenu,
  }
}
