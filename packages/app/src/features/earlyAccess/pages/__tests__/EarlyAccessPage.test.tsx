import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { StoreProvider } from '../../../../library/StoreProvider'
import { press } from '../../../landing/__tests__/domHelpers'
import { makeRecordedStore } from '../../__tests__/recordedStore'
import { EarlyAccessPage } from '../EarlyAccessPage'
import * as stories from '../EarlyAccessPage.stories'

afterEach(cleanup)

const mount = (props: Parameters<typeof EarlyAccessPage>[0] = {}) => {
  const { store, services } = makeRecordedStore()
  const view = render(
    <StoreProvider store={store}>
      <EarlyAccessPage {...props} />
    </StoreProvider>,
  )
  return { ...view, store, services }
}

const email = () =>
  screen.getByRole('textbox', { name: /Email address/ }) as HTMLInputElement
const submit = async () => {
  await act(async () => {
    fireEvent.submit(email().closest('form') as HTMLFormElement)
  })
}

describe('EarlyAccessPage (mirrors EarlyAccessPage.stories)', () => {
  it('Idle — an empty form on iPhone', () => {
    render(stories.Idle.render())
    expect(email().value).toBe('')
    expect(
      (screen.getByRole('radio', { name: 'iPhone' }) as HTMLInputElement)
        .checked,
    ).toBe(true)
  })

  it('TypingForMac — the slice drives the field and the picked platform', () => {
    render(stories.TypingForMac.render())
    expect(email().value).toBe('ada@example.com')
    expect(
      (screen.getByRole('radio', { name: 'Mac' }) as HTMLInputElement).checked,
    ).toBe(true)
  })

  it('BadAddressLeft — the field error from the slice shows under the field', () => {
    render(stories.BadAddressLeft.render())
    expect(screen.getByRole('alert').textContent).toMatch(
      /does not look right/i,
    )
  })
})

describe('EarlyAccessPage wiring (a REAL store, the stubbed Service)', () => {
  it('joins: typing then submitting sends one request and shows the success card', async () => {
    const { services, store } = mount()
    fireEvent.change(email(), { target: { value: 'ada@example.com' } })
    await submit()
    expect(services.earlyAccess.calls).toEqual([
      {
        email: 'ada@example.com',
        platform: 'ios',
        source: 'landing',
        locale: null,
      },
    ])
    expect(store.getState().earlyAccess.submit.kind).toBe('joined')
    expect(
      screen.getByRole('heading', { name: "You're on the list for iPhone" }),
    ).toBeTruthy()
  })

  it('an invalid address shows the error and sends nothing', async () => {
    const { services } = mount()
    fireEvent.change(email(), { target: { value: 'ada@' } })
    await submit()
    expect(services.earlyAccess.calls).toEqual([])
    expect(screen.getByRole('alert').textContent).toMatch(
      /does not look right/i,
    )
  })

  it('already on the list is terminal: no Try again, a different email resets the form', async () => {
    mount()
    fireEvent.change(email(), { target: { value: 'already@kro.invalid' } })
    await submit()
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    press(screen.getByRole('button', { name: 'Use a different email' }))
    expect(email().value).toBe('')
  })

  it('offline offers Try again, which returns to the form with the address kept', async () => {
    mount()
    fireEvent.change(email(), { target: { value: 'offline@kro.invalid' } })
    await submit()
    expect(screen.getByRole('alert').textContent).toMatch(/offline/i)
    press(screen.getByRole('button', { name: 'Try again' }))
    expect(email().value).toBe('offline@kro.invalid')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('a filled honeypot never reaches the Service', async () => {
    const { services, container } = mount()
    fireEvent.change(email(), { target: { value: 'bot@example.com' } })
    fireEvent.change(
      container.querySelector('input[name="website"]') as HTMLInputElement,
      { target: { value: 'spam' } },
    )
    await submit()
    expect(services.earlyAccess.calls).toEqual([])
  })

  it('the success card reports the hub press to the landing and uses the hub it was given', async () => {
    const onOpenHub = vi.fn()
    mount({ hubUrl: 'https://app.kro.example', onOpenHub })
    fireEvent.change(email(), { target: { value: 'ada@example.com' } })
    await submit()
    const link = screen.getByRole('link', { name: 'Open Kro for Web' })
    expect(link.getAttribute('href')).toBe('https://app.kro.example')
    press(link)
    expect(onOpenHub).toHaveBeenCalledTimes(1)
  })
})
