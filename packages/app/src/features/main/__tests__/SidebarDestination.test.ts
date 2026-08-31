/**
 * The destination model, checked against canon's own two string tables.
 *
 * `title` and `heading` differ for four destinations, and every one of those
 * four is a place a port normally loses a string. They are asserted
 * individually rather than as a pair so a failure names which one drifted.
 */
import { CirclePlay, Sun } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import {
  ALL_SIMPLE_DESTINATIONS,
  DESTINATION_SF_SYMBOL,
  DestinationKind,
  type SidebarDestination,
  destinationBottomEnforced,
  destinationHeading,
  destinationIcon,
  destinationId,
  destinationPath,
  destinationTabLabel,
  destinationTitle,
  isSameDestination,
  tabDestinationIcon,
} from '../SidebarDestination'

const project: SidebarDestination = {
  kind: DestinationKind.list,
  listId: 'p-1',
  listTitle: 'Home',
}

describe('macOS naming — canon SidebarDestinationType.title / .heading', () => {
  it('shows "Today" in the sidebar and "My Day" in the content', () => {
    const myDay: SidebarDestination = { kind: DestinationKind.myDay }
    expect(destinationTitle(myDay)).toBe('Today')
    expect(destinationHeading(myDay)).toBe('My Day')
  })

  it('shows "Jot Down" in the sidebar and "Inbox" in the content', () => {
    const inbox: SidebarDestination = { kind: DestinationKind.inbox }
    expect(destinationTitle(inbox)).toBe('Jot Down')
    expect(destinationHeading(inbox)).toBe('Inbox')
  })

  it('shows "Execute" in the sidebar and "Session" in the content', () => {
    const session: SidebarDestination = { kind: DestinationKind.session }
    expect(destinationTitle(session)).toBe('Execute')
    expect(destinationHeading(session)).toBe('Session')
  })

  it('shows "Adjust" in the sidebar and "Settings" in the content', () => {
    const settings: SidebarDestination = { kind: DestinationKind.settings }
    expect(destinationTitle(settings)).toBe('Adjust')
    expect(destinationHeading(settings)).toBe('Settings')
  })

  it('shows "Earn" in the sidebar and "Rewards" in the content', () => {
    const earn: SidebarDestination = { kind: DestinationKind.earn }
    expect(destinationTitle(earn)).toBe('Earn')
    expect(destinationHeading(earn)).toBe('Rewards')
  })

  it('names the standalone board "Priority Matrix", never "Triage"', () => {
    // Canon attaches this exact warning to the string: the shipped
    // Eisenhower-swipe flow is reached from the Inbox and is a different
    // feature; reusing its name here would collide with it.
    const matrix: SidebarDestination = { kind: DestinationKind.matrix }
    expect(destinationTitle(matrix)).toBe('Priority Matrix')
    expect(destinationHeading(matrix)).not.toContain('Triage')
  })

  it('calls the developer destination "Tweak", as canon does', () => {
    expect(destinationTitle({ kind: DestinationKind.dev })).toBe('Tweak')
  })
})

describe('tab labels — canon\'s iOS strings', () => {
  it('labels the initial tab "Do", not "Today"', () => {
    expect(destinationTabLabel({ kind: DestinationKind.myDay })).toBe('Do')
    expect(destinationTitle({ kind: DestinationKind.myDay })).toBe('Today')
  })

  it('falls back to the shared title where canon has no iOS override', () => {
    expect(destinationTabLabel({ kind: DestinationKind.plan })).toBe('Plan')
    expect(destinationTabLabel({ kind: DestinationKind.earn })).toBe('Earn')
  })

  it('uses the project name for a list', () => {
    expect(destinationTabLabel(project)).toBe('Home')
  })
})

describe('identity', () => {
  it('gives every simple destination a distinct id', () => {
    const ids = ALL_SIMPLE_DESTINATIONS.map(destinationId)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('keys a list by its project id, so two lists never collide', () => {
    expect(destinationId(project)).toBe('list:p-1')
    expect(
      isSameDestination(project, { ...project, listTitle: 'Renamed' }),
    ).toBe(true)
    expect(isSameDestination(project, { ...project, listId: 'p-2' })).toBe(
      false,
    )
  })

  it('never confuses a list with a plain destination', () => {
    expect(
      isSameDestination(project, { kind: DestinationKind.myDay }),
    ).toBe(false)
  })
})

describe('routes', () => {
  it('keeps the shell off the two paths the pre-parity app still serves', () => {
    // Canon's macOS names are what make this true rather than a workaround:
    // the session destination is "Execute" and the settings one is "Adjust".
    expect(destinationPath({ kind: DestinationKind.session })).toBe('/execute')
    expect(destinationPath({ kind: DestinationKind.settings })).toBe('/adjust')
  })

  it('gives every simple destination a distinct path', () => {
    const paths = ALL_SIMPLE_DESTINATIONS.map(destinationPath)
    expect(new Set(paths).size).toBe(paths.length)
    for (const path of paths) expect(path.startsWith('/')).toBe(true)
  })

  it('escapes a project id that would otherwise break the path', () => {
    expect(
      destinationPath({
        kind: DestinationKind.list,
        listId: 'a/b?c',
        listTitle: 'Odd',
      }),
    ).toBe('/lists/a%2Fb%3Fc')
  })
})

describe('glyphs', () => {
  it('resolves an icon for every destination, including a list', () => {
    for (const destination of ALL_SIMPLE_DESTINATIONS) {
      expect(destinationIcon(destination)).toBeTypeOf('object')
    }
    expect(destinationIcon(project)).toBeTypeOf('object')
  })

  it('records canon\'s SF Symbol for every destination', () => {
    for (const destination of ALL_SIMPLE_DESTINATIONS) {
      expect(DESTINATION_SF_SYMBOL[destination.kind]).toBeTruthy()
    }
  })

  it('draws My Day with the sun the issue prescribes, not the play glyph', () => {
    // A recorded divergence: canon's `.doTab` is `play.circle.fill`, and
    // KC-IS-#13's table prescribes `sun.max.fill` (canon's own `.today`
    // glyph for the same heading). The issue is the binding contract.
    expect(DESTINATION_SF_SYMBOL.myDay).toBe('sun.max.fill')
  })
})

describe('bottomEnforced — canon SidebarDestinationType.bottomEnforced', () => {
  it('pins Earn and Adjust, and nothing else', () => {
    const pinned = ALL_SIMPLE_DESTINATIONS.filter(destinationBottomEnforced)
    expect(pinned.map((destination) => destination.kind)).toEqual([
      DestinationKind.earn,
      DestinationKind.settings,
    ])
  })

  it('never pins a project list', () => {
    expect(destinationBottomEnforced(project)).toBe(false)
  })
})

describe('the phone tab glyph split', () => {
  it('draws play for the Do tab while the sidebar keeps the sun', () => {
    // Canon splits the glyph by surface: iPhone tab = play.circle.fill,
    // iPad/Mac sidebar = sun.max.fill for the same destination.
    expect(tabDestinationIcon({ kind: DestinationKind.myDay })).toBe(CirclePlay)
    expect(destinationIcon({ kind: DestinationKind.myDay })).toBe(Sun)
  })

  it('every other tab reuses the sidebar glyph', () => {
    expect(tabDestinationIcon({ kind: DestinationKind.plan })).toBe(
      destinationIcon({ kind: DestinationKind.plan }),
    )
    expect(tabDestinationIcon({ kind: DestinationKind.earn })).toBe(
      destinationIcon({ kind: DestinationKind.earn }),
    )
  })
})
