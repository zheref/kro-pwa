import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EndeavorActivityFragment } from '../EndeavorActivityFragment'
import { fragmentScenes } from './fragmentScenes'

afterEach(cleanup)
const noop = () => {}

describe('EndeavorActivityFragment — mirrors its stories', () => {
  it('shows the header, summary chips and every row for a task with history', () => {
    render(
      <EndeavorActivityFragment
        view={fragmentScenes.loadedMany}
        onSelectTab={noop}
      />,
    )
    expect(screen.getByText('Write the quarterly report')).toBeTruthy()
    expect(
      screen.getByText('Every activity recorded for this endeavor.'),
    ).toBeTruthy()
    expect(screen.getByText('4 records')).toBeTruthy()
    expect(screen.getByText('40 pts')).toBeTruthy()
    expect(screen.getAllByRole('listitem')).toHaveLength(4)
    expect(screen.getByText('Session finished')).toBeTruthy()
    expect(screen.getByText('Jan 13 · 2:00–3:05')).toBeTruthy()
    expect(screen.getByText('Jan 14 · 6:00')).toBeTruthy()
  })

  it('says no activity yet, without chips, when nothing was recorded', () => {
    render(
      <EndeavorActivityFragment
        view={fragmentScenes.loadedEmpty}
        onSelectTab={noop}
      />,
    )
    expect(screen.getByText('No activity yet')).toBeTruthy()
    expect(screen.queryByText(/records?$/)).toBeNull()
  })

  it('names the empty resolution when a tab filters every row out', () => {
    render(
      <EndeavorActivityFragment
        view={fragmentScenes.filteredEmpty}
        onSelectTab={noop}
      />,
    )
    expect(screen.getByText('No finished activity')).toBeTruthy()
    expect(
      screen.getByText('Choose another resolution to see its records.'),
    ).toBeTruthy()
  })

  it('explains that sessions do not apply to a reminder', () => {
    render(
      <EndeavorActivityFragment
        view={fragmentScenes.reminder}
        onSelectTab={noop}
      />,
    )
    expect(screen.getByText('Sessions don’t apply')).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Resolution' })).toBeNull()
  })

  it('shows the loading line while the load is in flight', () => {
    render(
      <EndeavorActivityFragment
        view={fragmentScenes.loading}
        onSelectTab={noop}
      />,
    )
    expect(screen.getByText('Loading activity…')).toBeTruthy()
  })

  it('shows the typed exception message when the load failed', () => {
    render(
      <EndeavorActivityFragment
        view={fragmentScenes.failed}
        onSelectTab={noop}
      />,
    )
    expect(screen.getByRole('alert').textContent).toContain(
      "No endeavor with id 'missing'",
    )
  })

  it('raises the tapped resolution through onSelectTab', async () => {
    const onSelectTab = vi.fn()
    render(
      <EndeavorActivityFragment
        view={fragmentScenes.loadedMany}
        onSelectTab={onSelectTab}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Aborted' }))
    expect(onSelectTab).toHaveBeenCalledWith('aborted')
  })
})
