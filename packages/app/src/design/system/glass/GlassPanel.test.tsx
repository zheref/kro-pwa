import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { GlassPanel } from './GlassPanel'

afterEach(cleanup)

describe('GlassPanel', () => {
  it('defaults to the content well — a surface that fills remaining space', () => {
    render(<GlassPanel data-testid="panel">Today</GlassPanel>)

    const panel = screen.getByTestId('panel')
    expect(panel.className).toContain('kro-glass')
    expect(panel.className).not.toContain('kro-glass--sidebar')
    expect(panel.className).not.toContain('kro-glass--dock')
    expect(panel.textContent).toBe('Today')
  })

  it('asks for the sidebar material when it is a split-view column', () => {
    render(<GlassPanel kind="sidebar" data-testid="panel" />)

    expect(screen.getByTestId('panel').className).toContain(
      'kro-glass--sidebar',
    )
  })

  it('asks for the dock material when it is a floating tab bar', () => {
    render(<GlassPanel kind="dock" data-testid="panel" />)

    expect(screen.getByTestId('panel').className).toContain('kro-glass--dock')
  })

  it('always establishes a flex column so a caller does not re-derive overflow', () => {
    render(<GlassPanel data-testid="panel" />)

    const className = screen.getByTestId('panel').className
    expect(className).toContain('flex')
    expect(className).toContain('min-h-0')
    expect(className).toContain('overflow-hidden')
    expect(className).toContain('flex-col')
  })

  it('lays the dock out as a row so tabs sit side by side', () => {
    render(<GlassPanel kind="dock" data-testid="panel" />)

    const className = screen.getByTestId('panel').className
    expect(className).toContain('flex-row')
    expect(className).not.toContain('flex-col')
  })

  it('renders the element the caller asked for', () => {
    render(
      <GlassPanel as="nav" kind="sidebar" data-testid="panel">
        Kro
      </GlassPanel>,
    )

    expect(screen.getByTestId('panel').tagName).toBe('NAV')
  })
})
