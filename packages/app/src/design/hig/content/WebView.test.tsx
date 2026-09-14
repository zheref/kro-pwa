import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { WebView, restrictedSandbox } from './WebView'

afterEach(cleanup)

describe('WebView', () => {
  it('names the frame with the title and prefers srcDoc so tests stay offline', () => {
    render(<WebView title="Session notes" srcDoc="<p>Session notes</p>" />)

    const frame = screen.getByTitle('Session notes')
    expect(frame.tagName).toBe('IFRAME')
    expect(frame.getAttribute('srcdoc')).toBe('<p>Session notes</p>')
    expect(screen.getByText('Session notes')).toBeTruthy()
  })

  it('applies an empty sandbox by default — maximum restriction', () => {
    render(<WebView title="Session notes" srcDoc="<p>Hello</p>" />)

    expect(screen.getByTitle('Session notes').getAttribute('sandbox')).toBe('')
    expect(restrictedSandbox()).toBe('')
    expect(restrictedSandbox('')).toBe('')
  })

  it('never grants allow-scripts and allow-same-origin together', () => {
    render(
      <WebView
        title="Preview"
        srcDoc="<p>Preview</p>"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />,
    )

    expect(restrictedSandbox('allow-scripts allow-same-origin')).toBe('')
    expect(
      restrictedSandbox('allow-scripts allow-same-origin allow-popups'),
    ).toBe('allow-popups')
    expect(screen.getByTitle('Preview').getAttribute('sandbox')).toBe(
      'allow-popups',
    )
  })

  it('sits in glass with the surface radius', () => {
    const { container } = render(
      <WebView title="Session notes" srcDoc="<p>Hello</p>" />,
    )

    expect(container.innerHTML).toContain('kro-glass')
    expect(container.innerHTML).toContain('rounded-kro-surface')
    expect(screen.getByTitle('Session notes').className).toContain(
      'bg-kro-absolute',
    )
  })

  it('defaults to compact type and grows for comfortable', () => {
    const { rerender } = render(
      <WebView title="Session notes" srcDoc="<p>Hello</p>" />,
    )

    expect(
      document
        .querySelector('[data-slot="web-view"]')
        ?.getAttribute('data-density'),
    ).toBe('compact')
    expect(screen.getByText('Session notes').className).toContain('text-xs')

    rerender(
      <WebView
        title="Session notes"
        srcDoc="<p>Hello</p>"
        density="comfortable"
      />,
    )
    expect(
      document
        .querySelector('[data-slot="web-view"]')
        ?.getAttribute('data-density'),
    ).toBe('comfortable')
    expect(screen.getByText('Session notes').className).toContain('text-sm')
  })
})
