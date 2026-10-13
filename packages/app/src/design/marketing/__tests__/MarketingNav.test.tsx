import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MarketingNav, type MarketingNavProps } from '../MarketingNav'

const props: MarketingNavProps = {
  brand: { label: 'Kro', href: '#top' },
  links: [
    { label: 'Features', href: '#features', id: 'features' },
    { label: 'Privacy', href: '#privacy', id: 'privacy' },
  ],
  cta: { label: 'Get Kro', href: '#get' },
}

beforeEach(() => {
  Object.defineProperty(window, 'scrollY', { value: 0, configurable: true })
})

afterEach(cleanup)

describe('MarketingNav', () => {
  it('is a banner with a labelled primary navigation of plain anchors', () => {
    render(<MarketingNav {...props} />)
    expect(screen.getByRole('banner')).toBeTruthy()
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(
      within(nav).getByRole('link', { name: 'Features' }).getAttribute('href'),
    ).toBe('#features')
    expect(
      screen.getByRole('link', { name: 'Get Kro' }).getAttribute('href'),
    ).toBe('#get')
  })

  it('marks only the active section link as the current location', () => {
    render(<MarketingNav {...props} activeId="privacy" />)
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(
      within(nav)
        .getByRole('link', { name: 'Privacy' })
        .getAttribute('aria-current'),
    ).toBe('location')
    expect(
      within(nav)
        .getByRole('link', { name: 'Features' })
        .getAttribute('aria-current'),
    ).toBeNull()
  })

  it('marks a route link as the current page, in the bar and in the open menu', () => {
    render(
      <MarketingNav
        {...props}
        links={[
          ...props.links,
          { id: 'pricing', label: 'Pricing', href: '/pricing' },
        ]}
        activeId="pricing"
        defaultMenuOpen
      />,
    )
    // The open sheet is modal, so the bar behind it is hidden from the tree.
    const nav = screen.getByRole('navigation', {
      name: 'Primary',
      hidden: true,
    })
    expect(
      within(nav)
        .getByRole('link', { name: 'Pricing', hidden: true })
        .getAttribute('aria-current'),
    ).toBe('page')
    const menu = screen.getByRole('dialog')
    const item = within(menu).getByRole('link', { name: 'Pricing' })
    expect(item.getAttribute('aria-current')).toBe('page')
    expect(item.className).toContain('is-active')
    expect(
      within(menu)
        .getByRole('link', { name: 'Privacy' })
        .hasAttribute('aria-current'),
    ).toBe(false)
  })

  it('deepens its shadow once the page has scrolled more than 8px', () => {
    render(<MarketingNav {...props} />)
    const bar = screen.getByRole('banner')
    expect(bar.className).not.toContain('is-scrolled')
    Object.defineProperty(window, 'scrollY', { value: 9, configurable: true })
    act(() => {
      window.dispatchEvent(new Event('scroll'))
    })
    expect(bar.className).toContain('is-scrolled')
  })

  it('reports navigation through onNavigate', () => {
    const onNavigate = vi.fn()
    render(<MarketingNav {...props} onNavigate={onNavigate} />)
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    fireEvent.click(within(nav).getByRole('link', { name: 'Features' }))
    expect(onNavigate).toHaveBeenCalledWith('#features')
  })

  it('opens the mobile menu, lists every link plus the CTA, and closes on Escape', async () => {
    const user = userEvent.setup()
    render(<MarketingNav {...props} />)
    await user.click(screen.getByRole('button', { name: 'Open menu' }))
    const dialog = screen.getByRole('dialog')
    expect(
      within(dialog)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual(['Features', 'Privacy', 'Get Kro'])
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('staggers the menu items with an index variable', () => {
    render(<MarketingNav {...props} defaultMenuOpen />)
    const items = within(screen.getByRole('dialog')).getAllByRole('listitem')
    expect(items.map((li) => li.style.getPropertyValue('--i'))).toEqual([
      '0',
      '1',
      '2',
    ])
  })

  it('closes the menu after a link is followed and keeps focus order inside the sheet', async () => {
    const user = userEvent.setup()
    const onNavigate = vi.fn()
    render(<MarketingNav {...props} onNavigate={onNavigate} defaultMenuOpen />)
    const dialog = screen.getByRole('dialog')
    await user.tab()
    expect(dialog.contains(document.activeElement)).toBe(true)
    await user.click(within(dialog).getByRole('link', { name: 'Privacy' }))
    expect(onNavigate).toHaveBeenCalledWith('#privacy')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders the trailing slot', () => {
    render(
      <MarketingNav
        {...props}
        trailing={<button type="button">Theme</button>}
      />,
    )
    expect(screen.getByRole('button', { name: 'Theme' })).toBeTruthy()
  })
})
