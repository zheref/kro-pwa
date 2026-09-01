import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs'

afterEach(cleanup)

function PlanModes() {
  return (
    <Tabs defaultValue="timeline">
      <TabsList aria-label="Plan mode">
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="list">List</TabsTrigger>
        <TabsTrigger value="matrix" disabled>
          Matrix
        </TabsTrigger>
      </TabsList>
      <TabsContent value="timeline">The day, hour by hour.</TabsContent>
      <TabsContent value="list">Everything, flat.</TabsContent>
      <TabsContent value="matrix">Value against urgency.</TabsContent>
    </Tabs>
  )
}

describe('Tabs', () => {
  it('exposes the WAI-ARIA tabs pattern', () => {
    render(<PlanModes />)

    expect(screen.getByRole('tablist', { name: 'Plan mode' })).toBeDefined()
    expect(screen.getAllByRole('tab')).toHaveLength(3)
  })

  it('shows only the selected panel', () => {
    render(<PlanModes />)

    expect(screen.getByText('The day, hour by hour.')).toBeDefined()
    expect(screen.queryByText('Everything, flat.')).toBeNull()
  })

  it('switches on click', async () => {
    render(<PlanModes />)

    await userEvent.click(screen.getByRole('tab', { name: 'List' }))

    expect(screen.getByText('Everything, flat.')).toBeDefined()
    expect(screen.queryByText('The day, hour by hour.')).toBeNull()
  })

  it('moves selection with the arrow keys — roving focus, not tab stops', async () => {
    render(<PlanModes />)

    await userEvent.click(screen.getByRole('tab', { name: 'Timeline' }))
    await userEvent.keyboard('{ArrowRight}')

    expect(
      screen.getByRole('tab', { name: 'List' }).getAttribute('aria-selected'),
    ).toBe('true')
  })

  it('raises the active trigger onto a solid surface, not just a tint', () => {
    // A selected state signalled by colour alone is invisible to a good share
    // of users; the elevation carries it too (epic AC 9).
    render(<PlanModes />)

    const active = screen.getByRole('tab', { name: 'Timeline' })
    expect(active.className).toContain('data-[state=active]:bg-kro-absolute')
    expect(active.className).toContain('data-[state=active]:shadow-kro-subtle')
  })

  it('renders the list on the control-weight glass', () => {
    render(<PlanModes />)

    const list = screen.getByRole('tablist')
    expect(list.className).toContain('kro-glass')
    expect(list.className).toContain('kro-glass--control')
  })

  it('fades a disabled mode exactly once and refuses to select it', async () => {
    render(<PlanModes />)

    const matrix = screen.getByRole('tab', { name: 'Matrix' })
    await userEvent.click(matrix)

    expect(matrix.getAttribute('aria-selected')).toBe('false')
    const fades = matrix.className
      .split(/\s+/)
      .filter((c) => c === 'disabled:opacity-[var(--kro-opacity-disabled)]')
    expect(fades).toHaveLength(1)
  })
})
