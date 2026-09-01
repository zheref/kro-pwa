/**
 * The vista-driven visibility panel, in the states its render tests assert
 * (`RC-11`).
 *
 * Every scene is built from the SHIPPED `.planDay` vista (or a lens derived
 * from it), so a story cannot show a filter family the registry does not
 * declare — which is the whole point of the exposes gate.
 */
import {
  EndeavorHost,
  EndeavorsVistas,
  UserFilter,
  makeEndeavorsLens,
  vistaWithLens,
} from '@kro/core'
import { Stage } from '../../../../design/endeavor/storyStage'
import { initialPlanVisibility } from '../../PlanState'
import { PlanVisibilityFragment } from './PlanVisibilityFragment'

export default {
  title: 'Plan/Visibility panel',
  component: PlanVisibilityFragment,
}

const planDay = EndeavorsVistas.planDay

const panel = (
  overrides: Partial<Parameters<typeof PlanVisibilityFragment>[0]> = {},
) => (
  <div style={{ width: 420 }}>
    <PlanVisibilityFragment
      vista={planDay}
      visibility={initialPlanVisibility}
      onToggle={() => {}}
      {...overrides}
    />
  </div>
)

/** The shipping state: four declared families, no calendar inventory yet. */
export const PlanVistaDefaults = {
  render: () => <Stage>{panel()}</Stage>,
}

/** The same panel, dark. */
export const PlanVistaDefaultsDark = {
  render: () => <Stage theme="dark">{panel()}</Stage>,
}

/** Filters applied: the rows invert, and the eye upstream turns struck-through. */
export const SomethingFiltered = {
  render: () => (
    <Stage>
      {panel({
        visibility: {
          ...initialPlanVisibility,
          hiddenHosts: [EndeavorHost.googleCalendar],
          hiddenCalendarIds: ['google:work'],
        },
        calendars: [
          { id: 'google:work', name: 'Work' },
          { id: 'google:home', name: 'Home' },
        ],
      })}
    </Stage>
  ),
}

/** Calendars loaded — the family that only exists because the vista declares it. */
export const WithCalendars = {
  render: () => (
    <Stage>
      {panel({
        calendars: [
          { id: 'google:work', name: 'Work' },
          { id: 'google:home', name: 'Home' },
          { id: 'google:team', name: 'Team rota' },
        ],
      })}
    </Stage>
  ),
}

/** A narrower vista: the panel shrinks to what that lens declares, and no more. */
export const KindsOnlyVista = {
  render: () => (
    <Stage>
      {panel({
        vista: vistaWithLens(
          planDay,
          makeEndeavorsLens({ exposes: [UserFilter.kinds] }),
        ),
      })}
    </Stage>
  ),
}
