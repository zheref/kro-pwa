import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  COLLISION_PADDING_PX,
  CollisionInsetsProvider,
  anchoredPanelOffset,
  collisionPaddingFor,
  useDefaultCollisionPadding,
} from './collision'

describe('collisionPaddingFor', () => {
  it('keeps the standard gap from every edge with no chrome', () => {
    expect(
      collisionPaddingFor({ top: 0, right: 0, bottom: 0, left: 0 }),
    ).toEqual({ top: 8, right: 8, bottom: 8, left: 8 })
  })

  it('adds the sidebar to the leading edge', () => {
    expect(
      collisionPaddingFor({ top: 0, right: 0, bottom: 0, left: 208 }).left,
    ).toBe(208 + COLLISION_PADDING_PX)
  })

  it('takes a caller’s own gap', () => {
    expect(
      collisionPaddingFor({ top: 0, right: 0, bottom: 0, left: 0 }, 12).right,
    ).toBe(12)
  })
})

describe('useDefaultCollisionPadding', () => {
  const Probe = ({
    override,
    onValue,
  }: {
    readonly override?: number
    readonly onValue: (value: unknown) => void
  }) => {
    onValue(useDefaultCollisionPadding(override))
    return null
  }

  it('reads the shell’s sidebar as leading padding for every popover and menu', () => {
    let seen: unknown
    render(
      <CollisionInsetsProvider
        insets={{ top: 0, right: 0, bottom: 0, left: 208 }}
      >
        <Probe
          onValue={(value) => {
            seen = value
          }}
        />
      </CollisionInsetsProvider>,
    )
    expect(seen).toEqual({ top: 8, right: 8, bottom: 8, left: 216 })
  })

  it('keeps the sidebar even when a caller asks for its own gap', () => {
    let seen: unknown
    render(
      <CollisionInsetsProvider
        insets={{ top: 0, right: 0, bottom: 0, left: 208 }}
      >
        <Probe
          override={12}
          onValue={(value) => {
            seen = value
          }}
        />
      </CollisionInsetsProvider>,
    )
    expect(seen).toEqual({ top: 12, right: 12, bottom: 12, left: 220 })
  })

  it('is the plain viewport gap outside any shell', () => {
    let seen: unknown
    render(
      <Probe
        onValue={(value) => {
          seen = value
        }}
      />,
    )
    expect(seen).toEqual({ top: 8, right: 8, bottom: 8, left: 8 })
  })
})

describe('anchoredPanelOffset', () => {
  const base = { viewportWidth: 1280, panelWidth: 460 }

  it('stays put when the preferred alignment fits', () => {
    expect(
      anchoredPanelOffset({
        ...base,
        anchorLeft: 900,
        anchorRight: 940,
        align: 'end',
      }),
    ).toBe(0)
  })

  it('flips a start-aligned panel that would run off the right edge', () => {
    // Start at 1100 would end at 1560; end-aligned it spans 680–1140.
    expect(
      anchoredPanelOffset({
        ...base,
        anchorLeft: 1100,
        anchorRight: 1140,
        align: 'start',
      }),
    ).toBe(680 - 1100)
  })

  it('moves an end-aligned panel out from under the sidebar toward the content', () => {
    // The Do visibility panel: anchor 260–292, end-aligned it would start at
    // -168, under a 208px sidebar. Start-aligned (260) fits, so it flips.
    expect(
      anchoredPanelOffset({
        ...base,
        anchorLeft: 260,
        anchorRight: 292,
        align: 'end',
        insets: { top: 0, right: 0, bottom: 0, left: 208 },
      }),
    ).toBe(260 - (292 - 460))
  })

  it('shifts just enough when neither alignment fits', () => {
    expect(
      anchoredPanelOffset({
        viewportWidth: 600,
        panelWidth: 400,
        anchorLeft: 250,
        anchorRight: 290,
        align: 'start',
        insets: { top: 0, right: 0, bottom: 0, left: 180 },
      }),
    ).toBe(192 - 250)
  })
})
