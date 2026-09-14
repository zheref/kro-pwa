import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SearchField } from './SearchField'

afterEach(cleanup)

describe('SearchField', () => {
  it('is a search input on the recessed field, with leading inset', () => {
    render(<SearchField aria-label="Find endeavors" />)

    const field = screen.getByRole('searchbox', { name: 'Find endeavors' })
    expect(field.getAttribute('type')).toBe('search')
    expect(field.getAttribute('placeholder')).toBe('Search')
    expect(field.className).toContain('pl-10')
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
  })

  it('shows a labelled clear once there is text and empties the value', async () => {
    const onValueChange = vi.fn()
    render(
      <SearchField
        aria-label="Find endeavors"
        defaultValue="tokens"
        onValueChange={onValueChange}
      />,
    )

    expect(screen.getByRole('searchbox').className).toContain('pr-12')

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onValueChange).toHaveBeenCalledWith('')
    expect(screen.getByRole<HTMLInputElement>('searchbox').value).toBe('')
    expect(screen.getByRole('searchbox').className.includes('pr-12')).toBe(
      false,
    )
    expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
  })

  it('offers Cancel only when the caller passed onCancel', async () => {
    const onCancel = vi.fn()
    render(<SearchField aria-label="Find endeavors" onCancel={onCancel} />)

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('stays controlled when a caller passes `value`', async () => {
    const onValueChange = vi.fn()
    render(
      <SearchField
        aria-label="Find endeavors"
        value="port"
        onValueChange={onValueChange}
      />,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Clear' }))

    expect(onValueChange).toHaveBeenCalledWith('')
    expect(screen.getByRole<HTMLInputElement>('searchbox').value).toBe('port')
  })

  it('reports typed characters', async () => {
    const onValueChange = vi.fn()
    render(
      <SearchField aria-label="Find endeavors" onValueChange={onValueChange} />,
    )

    await userEvent.type(screen.getByRole('searchbox'), 'a')

    expect(onValueChange).toHaveBeenCalledWith('a')
  })

  it('defaults to compact and grows for comfortable', () => {
    const { rerender } = render(
      <SearchField aria-label="Find endeavors" defaultValue="tokens" />,
    )

    expect(
      document
        .querySelector('[data-slot="search-field"]')
        ?.getAttribute('data-density'),
    ).toBe('compact')
    expect(screen.getByRole('searchbox').getAttribute('data-density')).toBe(
      'compact',
    )
    expect(screen.getByRole('button', { name: 'Clear' }).className).toContain(
      'size-6',
    )

    rerender(
      <SearchField
        aria-label="Find endeavors"
        defaultValue="tokens"
        density="comfortable"
      />,
    )
    expect(
      document
        .querySelector('[data-slot="search-field"]')
        ?.getAttribute('data-density'),
    ).toBe('comfortable')
    expect(screen.getByRole('searchbox').getAttribute('data-density')).toBe(
      'comfortable',
    )
    expect(screen.getByRole('button', { name: 'Clear' }).className).toContain(
      'size-9',
    )
  })
})
