'use client'

/**
 * Endeavor Activity's stateful container (`RC-37`, `UZF-4`). Requests the
 * endeavor's activity on mount and whenever `endeavorId` changes, aborts the
 * in-flight load on unmount (`UZF-14`), and renders exactly one Fragment.
 */
import { useCallback, useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../../../library/hooks'
import {
  onActivityRequested,
  userDidSelectActivityTab,
} from '../EndeavorActivityFeature'
import { loadEndeavorActivityThunk } from '../EndeavorActivityProducer'
import type { ActivityTab } from '../EndeavorActivityRows'
import { selectEndeavorActivityView } from '../EndeavorActivitySelectors'
import { EndeavorActivityFragment } from './EndeavorActivityFragment'

export interface EndeavorActivityPageProps {
  readonly endeavorId: string
  readonly locale?: string
}

export function EndeavorActivityPage({
  endeavorId,
  locale,
}: EndeavorActivityPageProps) {
  const dispatch = useAppDispatch()
  const view = useAppSelector(selectEndeavorActivityView)

  useEffect(() => {
    dispatch(onActivityRequested({ endeavorId }))
    const effect = dispatch(loadEndeavorActivityThunk({ endeavorId }))
    return () => effect.abort()
  }, [dispatch, endeavorId])

  const onSelectTab = useCallback(
    (tab: ActivityTab) => dispatch(userDidSelectActivityTab({ tab })),
    [dispatch],
  )

  return (
    <EndeavorActivityFragment
      view={view}
      locale={locale}
      onSelectTab={onSelectTab}
    />
  )
}
