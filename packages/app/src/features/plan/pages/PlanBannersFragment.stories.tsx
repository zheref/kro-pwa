/**
 * The status column, in the states its render tests assert (`RC-11`).
 *
 * The two banners are separate stories on purpose: they are separate product
 * states, and the difference a reviewer has to be able to see is that only one
 * of them has a way out.
 */
import { BothSchemes, Stage } from '../../../design/endeavor/storyStage'
import { PlanBannersFragment } from './PlanBannersFragment'

export default {
  title: 'Plan/Status banners',
  component: PlanBannersFragment,
}

const STALE = 'Rate limit hit. Last synced 3 min ago'
const REVOKED =
  'Kro no longer has access to your Google Calendar. Reconnect to see your events.'

/** Google is rate-limiting reads; the day is still showing its last good events. */
export const StaleSync = {
  render: () => (
    <Stage width={390}>
      <PlanBannersFragment
        staleSyncLabel={STALE}
        needsReconnect={false}
        onTapReconnect={() => {}}
      />
    </Stage>
  ),
}

/** No successful sync on record — canon's second rate-limit line. */
export const StaleSyncNeverSynced = {
  render: () => (
    <Stage width={390}>
      <PlanBannersFragment
        staleSyncLabel="Rate limit reached — try again later"
        needsReconnect={false}
        onTapReconnect={() => {}}
      />
    </Stage>
  ),
}

/** The grant was revoked: the one banner with a recovery path. */
export const NeedsReconnect = {
  render: () => (
    <Stage width={390}>
      <PlanBannersFragment
        staleSyncLabel={null}
        needsReconnect
        reconnectDetail={REVOKED}
        onTapReconnect={() => {}}
      />
    </Stage>
  ),
}

/** Both at once — the column has to stack rather than choose. */
export const BothBanners = {
  render: () => (
    <Stage width={390}>
      <PlanBannersFragment
        staleSyncLabel={STALE}
        needsReconnect
        reconnectDetail={REVOKED}
        onTapReconnect={() => {}}
      />
    </Stage>
  ),
}

/** Both schemes: the fills are opaque, so they must read on either page. */
export const BothSchemesBothBanners = {
  render: () => (
    <BothSchemes>
      <PlanBannersFragment
        staleSyncLabel={STALE}
        needsReconnect
        reconnectDetail={REVOKED}
        onTapReconnect={() => {}}
      />
    </BothSchemes>
  ),
}
