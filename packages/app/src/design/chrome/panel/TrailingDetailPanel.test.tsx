/**
 * TrailingDetailPanel render tests, mirroring the four scenes of its Gallery (`RC-11`):
 * presented with a subtitle, the whole-day title alone, a long non-ASCII
 * subtitle, and hidden — plus the geometry and the Escape binding.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  DETAIL_PANEL_WIDTH_CSS,
  PanelToolbarButton,
  TrailingDetailPanel,
  detailPanelAccessoryInset,
  detailPanelWidth,
} from './TrailingDetailPanel'

afterEach(cleanup)

describe('TrailingDetailPanel — the stories', () => {
  it('shows the title, the endeavor subtitle and the body when presented', () => {
    render(
      <TrailingDetailPanel
        isPresented
        title="Details"
        subtitle="Write the quarterly review"
        onDismiss={() => {}}
      >
        <p>Kind</p>
      </TrailingDetailPanel>,
    )
    const panel = screen.getByTestId('trailing-detail-panel')
    expect(panel.getAttribute('data-presented')).toBe('true')
    expect(screen.getByText('Details')).toBeTruthy()
    expect(screen.getByText('Write the quarterly review')).toBeTruthy()
    expect(screen.getByText('Kind')).toBeTruthy()
  })

  it('shows the title alone in a whole-day mode', () => {
    render(
      <TrailingDetailPanel
        isPresented
        title="Day Progress"
        onDismiss={() => {}}
      />,
    )
    expect(screen.getByText('Day Progress')).toBeTruthy()
    expect(
      screen.getByRole('complementary', { name: 'Day Progress' }),
    ).toBeTruthy()
  })

  it('keeps a long non-ASCII subtitle on one truncating line', () => {
    const subtitle = '四半期のレビューを書く — and every appendix 🌸'
    render(
      <TrailingDetailPanel
        isPresented
        title="Endeavor Activity"
        subtitle={subtitle}
        onDismiss={() => {}}
      />,
    )
    expect(screen.getByText(subtitle).className).toContain('truncate')
  })

  it('parks a hidden panel off the trailing edge, transparent and inert', () => {
    render(
      <TrailingDetailPanel isPresented={false} title="" onDismiss={() => {}} />,
    )
    const panel = screen.getByTestId('trailing-detail-panel')
    expect(panel.getAttribute('data-presented')).toBe('false')
    expect(panel.getAttribute('aria-hidden')).toBe('true')
    expect(panel.style.opacity).toBe('0')
    expect(panel.style.transform).toContain('translateX(calc(100% + 16px))')
  })
})

describe('TrailingDetailPanel — dismissal', () => {
  it('dismisses from the header control', () => {
    const onDismiss = vi.fn()
    render(
      <TrailingDetailPanel isPresented title="Details" onDismiss={onDismiss} />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('dismisses on Escape while presented', () => {
    const onDismiss = vi.fn()
    render(
      <TrailingDetailPanel isPresented title="Details" onDismiss={onDismiss} />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('ignores Escape while hidden, and an Escape something else handled', () => {
    const onDismiss = vi.fn()
    const { rerender } = render(
      <TrailingDetailPanel
        isPresented={false}
        title=""
        onDismiss={onDismiss}
      />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    rerender(
      <TrailingDetailPanel isPresented title="Details" onDismiss={onDismiss} />,
    )
    const handled = new KeyboardEvent('keydown', {
      key: 'Escape',
      cancelable: true,
    })
    handled.preventDefault()
    window.dispatchEvent(handled)
    fireEvent.keyDown(window, { key: 'Enter' })
    expect(onDismiss).not.toHaveBeenCalled()
  })
})

describe("canon's geometry", () => {
  it('floors the width at 320 on a narrow window', () => {
    expect(detailPanelWidth(700)).toBe(320)
  })

  it('tracks 36% of a mid-size window', () => {
    expect(detailPanelWidth(1200)).toBeCloseTo(432)
  })

  it('caps at 520 on a wide window, and at 52% on a very narrow one', () => {
    expect(detailPanelWidth(2400)).toBe(520)
    expect(detailPanelWidth(500)).toBe(260)
  })

  it('writes the same formula in CSS, and moves the FAB only while presented', () => {
    expect(DETAIL_PANEL_WIDTH_CSS).toBe('min(max(36vw, 320px), 520px, 52vw)')
    expect(detailPanelAccessoryInset(true)).toBe(
      'calc(min(max(36vw, 320px), 520px, 52vw) + 12px)',
    )
    expect(detailPanelAccessoryInset(false)).toBe('0px')
  })
})

describe('TrailingDetailPanel — placement and scrolling', () => {
  it("starts at canon's 96 when no top inset is given", () => {
    render(
      <TrailingDetailPanel isPresented title="Details" onDismiss={() => {}} />,
    )
    expect(screen.getByTestId('trailing-detail-panel').style.top).toBe('96px')
  })

  it('starts where the shell says the large title ends', () => {
    render(
      <TrailingDetailPanel
        isPresented
        title="Details"
        topInset={188}
        onDismiss={() => {}}
      />,
    )
    expect(screen.getByTestId('trailing-detail-panel').style.top).toBe('188px')
  })

  it('scrolls its body when the content is taller than the panel', () => {
    render(
      <TrailingDetailPanel isPresented title="Details" onDismiss={() => {}}>
        <div style={{ height: 4000 }}>tall</div>
      </TrailingDetailPanel>,
    )
    const body = screen.getByTestId('trailing-detail-panel-body')
    expect(body.className).toContain('overflow-y-auto')
    expect(body.className).toContain('min-h-0')
    expect(body.className).toContain('flex-1')
    // It scrolls, but no bar is drawn.
    expect(body.className).toContain('[scrollbar-width:none]')
    expect(body.className).toContain('[&::-webkit-scrollbar]:hidden')
  })
})

describe('TrailingDetailPanel — a centred title content', () => {
  it('replaces the title text with the content, keeping the close leading', () => {
    render(
      <TrailingDetailPanel
        isPresented
        title="Session Setup"
        subtitle="Slides"
        titleContent={<div role="group" aria-label="Session mode" />}
        trailingAccessory={<button type="button">Show sessions</button>}
        onDismiss={() => {}}
      />,
    )
    const navigation = screen.getByTestId('trailing-detail-panel-navigation')
    expect(navigation.textContent).not.toContain('Session Setup')
    const children = Array.from(navigation.children)
    expect(children[0]?.querySelector('[aria-label="Close"]')).toBeTruthy()
    expect(
      children[1]?.querySelector('[aria-label="Session mode"]'),
    ).toBeTruthy()
    expect(children[2]?.textContent).toBe('Show sessions')
  })

  it('still names the panel with the title for assistive tech', () => {
    render(
      <TrailingDetailPanel
        isPresented
        title="Session Setup"
        titleContent={<span />}
        onDismiss={() => {}}
      />,
    )
    expect(
      screen.getByRole('complementary', { name: 'Session Setup' }),
    ).toBeTruthy()
  })

  it('dismisses from the centred layout’s close too', () => {
    const onDismiss = vi.fn()
    render(
      <TrailingDetailPanel
        isPresented
        title="Session Setup"
        titleContent={<span />}
        onDismiss={onDismiss}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})

describe('TrailingDetailPanel — one toolbar button style', () => {
  it('draws the close and a trailing item as the same glass circle', () => {
    render(
      <TrailingDetailPanel
        isPresented
        title="Session Setup"
        titleContent={<span />}
        trailingAccessory={
          <PanelToolbarButton label="Show sessions" onPress={() => {}}>
            <span />
          </PanelToolbarButton>
        }
        onDismiss={() => {}}
      />,
    )
    const close = screen.getByRole('button', { name: 'Close' })
    const show = screen.getByRole('button', { name: 'Show sessions' })
    expect(close.className).toBe(show.className)
    expect(close.className).toContain('kro-glass')
    expect(close.style.width).toBe(show.style.width)
  })

  it('uses the same close in the titled layout (Details)', () => {
    render(
      <TrailingDetailPanel
        isPresented
        title="Details"
        subtitle="Slides"
        onDismiss={() => {}}
      />,
    )
    expect(
      screen
        .getByRole('button', { name: 'Close' })
        .hasAttribute('data-kro-panel-toolbar-button'),
    ).toBe(true)
  })

  it('reports a toolbar button press', () => {
    const onPress = vi.fn()
    render(
      <PanelToolbarButton label="Show sessions" onPress={onPress}>
        <span />
      </PanelToolbarButton>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Show sessions' }))
    expect(onPress).toHaveBeenCalledTimes(1)
  })
})

describe('TrailingDetailPanel — drill-in navigation', () => {
  it('shows Back instead of Close while drilled in, and goes back from it', () => {
    const onBack = vi.fn()
    render(
      <TrailingDetailPanel
        isPresented
        title="Endeavor Activity"
        onBack={onBack}
        navigationDepth={1}
        onDismiss={() => {}}
      />,
    )
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('steps back on Escape while drilled in, and closes only at the top', () => {
    const onBack = vi.fn()
    const onDismiss = vi.fn()
    const { rerender } = render(
      <TrailingDetailPanel
        isPresented
        title="Activity"
        onBack={onBack}
        onDismiss={onDismiss}
      />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    rerender(
      <TrailingDetailPanel isPresented title="Session" onDismiss={onDismiss} />,
    )
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('slides a pushed reading in from the trailing edge and a popped one from the leading', () => {
    const { rerender } = render(
      <TrailingDetailPanel
        isPresented
        title="Session"
        navigationDepth={0}
        navigationKey="a"
        onDismiss={() => {}}
      />,
    )
    const body = () => screen.getByTestId('trailing-detail-panel-body')
    expect(body().getAttribute('data-kro-drill')).toBe('none')
    rerender(
      <TrailingDetailPanel
        isPresented
        title="Activity"
        navigationDepth={1}
        navigationKey="b"
        onBack={() => {}}
        onDismiss={() => {}}
      />,
    )
    expect(body().getAttribute('data-kro-drill')).toBe('push')
    expect(body().style.animation).toContain('kro-drill-push')
    // …and still, after an unrelated re-render mid-slide.
    rerender(
      <TrailingDetailPanel
        isPresented
        title="Activity"
        subtitle="x"
        navigationDepth={1}
        navigationKey="b"
        onBack={() => {}}
        onDismiss={() => {}}
      />,
    )
    expect(body().style.animation).toContain('kro-drill-push')
    rerender(
      <TrailingDetailPanel
        isPresented
        title="Session"
        navigationDepth={0}
        navigationKey="c"
        onDismiss={() => {}}
      />,
    )
    expect(body().getAttribute('data-kro-drill')).toBe('pop')
  })
})

describe('TrailingDetailPanel — header margins and backdrop', () => {
  it('pads the header equally on every side, so vertical matches horizontal', () => {
    render(
      <TrailingDetailPanel isPresented title="Details" onDismiss={() => {}} />,
    )
    const nav = screen.getByTestId('trailing-detail-panel-navigation')
    expect(nav.className).toContain('p-3')
    expect(nav.className).not.toMatch(/py-|px-/)
  })

  it('paints a backdrop from the panel top, behind the header and the body', () => {
    render(
      <TrailingDetailPanel
        isPresented
        title="Session Setup"
        backdrop={<div data-testid="wash" />}
        onDismiss={() => {}}
      />,
    )
    const backdrop = screen.getByTestId('trailing-detail-panel-backdrop')
    expect(backdrop.className).toContain('top-0')
    expect(backdrop.className).toContain('z-0')
    expect(
      screen.getByTestId('trailing-detail-panel-navigation').className,
    ).toContain('z-10')
    expect(
      screen.getByTestId('trailing-detail-panel-body').className,
    ).toContain('z-10')
  })

  it('draws no backdrop layer when none is given', () => {
    render(
      <TrailingDetailPanel isPresented title="Details" onDismiss={() => {}} />,
    )
    expect(screen.queryByTestId('trailing-detail-panel-backdrop')).toBeNull()
  })
})

describe('PanelToolbarButton', () => {
  it('answers the pointer like a FAB menu item: interactive control glass', () => {
    render(
      <PanelToolbarButton label="Close" onPress={() => {}}>
        x
      </PanelToolbarButton>,
    )
    const button = screen.getByRole('button', { name: 'Close' })
    expect(button.className).toContain('kro-glass--control')
    expect(button.className).toContain('kro-glass--interactive')
  })
})

describe('TrailingDetailPanel — keyboard continuity across a drill (UX-2)', () => {
  const drilled = (key: string, depth: number, onBack: (() => void) | null) => (
    <TrailingDetailPanel
      isPresented
      title="Details"
      onDismiss={() => {}}
      onBack={onBack}
      navigationDepth={depth}
      navigationKey={key}
    >
      <button type="button">Row {key}</button>
    </TrailingDetailPanel>
  )

  it('moves focus to Back when a row inside the pane drills in', () => {
    const { rerender } = render(drilled('root', 0, null))
    screen.getByRole('button', { name: 'Row root' }).focus()
    rerender(drilled('activity', 1, () => {}))
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Back' }),
    )
  })

  it('moves focus to Close when Back pops to the top reading', () => {
    const { rerender } = render(drilled('activity', 1, () => {}))
    screen.getByRole('button', { name: 'Row activity' }).focus()
    rerender(drilled('root', 0, null))
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Close' }),
    )
  })

  it('leaves focus alone when it sits outside the pane', () => {
    const outside = document.createElement('button')
    document.body.appendChild(outside)
    const { rerender } = render(drilled('root', 0, null))
    outside.focus()
    rerender(drilled('activity', 1, () => {}))
    expect(document.activeElement).toBe(outside)
    outside.remove()
  })

  it('does not move focus on a re-render of the same reading', () => {
    const { rerender } = render(drilled('root', 0, null))
    const row = screen.getByRole('button', { name: 'Row root' })
    row.focus()
    rerender(drilled('root', 0, null))
    expect(document.activeElement).toBe(row)
  })
})
