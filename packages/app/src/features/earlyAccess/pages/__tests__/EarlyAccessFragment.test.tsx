import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { press } from '../../../landing/__tests__/domHelpers'
import {
  EarlyAccessMocks,
  earlyAccessFragmentProps,
} from '../../EarlyAccessMocks'
import { EarlyAccessFragment } from '../EarlyAccessFragment'
import * as stories from '../EarlyAccessFragment.stories'

afterEach(cleanup)

const email = () =>
  screen.getByRole('textbox', { name: /Email address/ }) as HTMLInputElement

describe('EarlyAccessFragment (mirrors EarlyAccessFragment.stories)', () => {
  it('Idle — a labelled required email field, seven platform radios with iPhone chosen, one submit', () => {
    render(stories.Idle.render())
    expect(email().required).toBe(true)
    expect(email().getAttribute('autocomplete')).toBe('email')
    expect(screen.getAllByRole('radio')).toHaveLength(7)
    expect(
      (screen.getByRole('radio', { name: 'iPhone' }) as HTMLInputElement)
        .checked,
    ).toBe(true)
    expect(
      screen.getByRole('button', { name: 'Get early access' }),
    ).toBeTruthy()
    expect(
      screen.getByText(
        /We don't show sign-up counts, ratings or quotes here\. We'll email you when your platform is ready\./,
      ),
    ).toBeTruthy()
    expect(screen.queryByText(/fabricated/i)).toBeNull()
  })

  it('Idle — the privacy notice sits under the email field and the input is described by it', () => {
    render(stories.Idle.render())
    const notice = screen.getByText(/We keep your address and platform pick/)
    expect(notice.textContent).toMatch(/then delete them/)
    expect(notice.textContent).toMatch(/link in the footer/)
    expect(email().getAttribute('aria-describedby')).toBe(notice.id)
  })

  it('Typing — shows the typed address and the Mac chosen', () => {
    render(stories.Typing.render())
    expect(email().value).toBe('ada@example.com')
    expect(
      (screen.getByRole('radio', { name: 'Mac' }) as HTMLInputElement).checked,
    ).toBe(true)
  })

  it('TypingInvalid — the error sits under the field, linked by aria-describedby, and marks it invalid', () => {
    render(stories.TypingInvalid.render())
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toMatch(/does not look right/i)
    expect(email().getAttribute('aria-invalid')).toBe('true')
    const ids = (email().getAttribute('aria-describedby') ?? '').split(' ')
    expect(ids).toContain(alert.id)
    expect(document.getElementById(ids[0] ?? '')?.textContent).toBe(
      alert.textContent,
    )
    expect(
      ids.map((id) => document.getElementById(id)?.textContent).join(' '),
    ).toMatch(/We keep your address/)
  })

  it('Submitting — the button is disabled with a progress spinner, and the form is busy', () => {
    const { container } = render(stories.Submitting.render())
    const button = screen.getByRole('button', {
      name: /Joining the list/,
    }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(screen.getByRole('progressbar')).toBeTruthy()
    expect(container.querySelector('form')?.getAttribute('aria-busy')).toBe(
      'true',
    )
  })

  it('Joined — the success card names the platform, shows the address and links to the hub', () => {
    render(stories.Joined.render())
    expect(
      screen.getByRole('heading', { name: "You're on the list for iPhone" }),
    ).toBeTruthy()
    expect(screen.getByRole('status').textContent).toContain('ada@example.com')
    expect(
      screen
        .getByRole('link', { name: 'Open Kro for Web' })
        .getAttribute('href'),
    ).toBe('/my-day')
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('JoinedDark — same card, with the queue position it was given', () => {
    render(stories.JoinedDark.render())
    expect(screen.getByRole('status').textContent).toContain('number 3 in line')
  })

  it('FailedInvalid — the message appears once, under the field, not twice', () => {
    render(stories.FailedInvalid.render())
    expect(screen.getAllByText(/does not look right/i)).toHaveLength(1)
  })

  it('FailedAlreadyJoined — says so, and offers a different email, not a retry', () => {
    render(stories.FailedAlreadyJoined.render())
    expect(screen.getByRole('alert').textContent).toMatch(
      /already on the list/i,
    )
    expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Use a different email' }),
    ).toBeTruthy()
  })

  it('FailedOffline and FailedUnavailable — retryable, with Try again', () => {
    const { unmount } = render(stories.FailedOffline.render())
    expect(screen.getByRole('alert').textContent).toMatch(/offline/i)
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
    unmount()
    render(stories.FailedUnavailable.render())
    expect(screen.getByRole('alert').textContent).toMatch(
      /not open on this site yet/i,
    )
    expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy()
  })
})

describe('EarlyAccessFragment intents and the honeypot', () => {
  const handlers = () => ({
    onEmailChange: vi.fn(),
    onEmailBlur: vi.fn(),
    onPlatformChange: vi.fn(),
    onHoneypotChange: vi.fn(),
    onSubmit: vi.fn(),
    onDismissFailure: vi.fn(),
    onStartOver: vi.fn(),
    onOpenHub: vi.fn(),
  })

  it('typing, leaving the field and picking a platform are reported', () => {
    const h = handlers()
    render(
      <EarlyAccessFragment
        {...earlyAccessFragmentProps(EarlyAccessMocks.idle)}
        {...h}
      />,
    )
    fireEvent.change(email(), { target: { value: 'a@b.co' } })
    fireEvent.blur(email())
    fireEvent.click(screen.getByRole('radio', { name: 'Windows' }))
    expect(h.onEmailChange).toHaveBeenCalledWith('a@b.co')
    expect(h.onEmailBlur).toHaveBeenCalledTimes(1)
    expect(h.onPlatformChange).toHaveBeenCalledWith('windows')
  })

  it('submitting the form reports once and does not reload the page', () => {
    const h = handlers()
    const { container } = render(
      <EarlyAccessFragment
        {...earlyAccessFragmentProps(EarlyAccessMocks.typing)}
        {...h}
      />,
    )
    const proceeded = fireEvent.submit(
      container.querySelector('form') as HTMLFormElement,
    )
    expect(proceeded).toBe(false)
    expect(h.onSubmit).toHaveBeenCalledTimes(1)
  })

  it('the honeypot is aria-hidden, out of the tab order, autofill-off and off-screen', () => {
    const { container } = render(
      <EarlyAccessFragment
        {...earlyAccessFragmentProps(EarlyAccessMocks.idle)}
        {...handlers()}
      />,
    )
    const field = container.querySelector(
      'input[name="website"]',
    ) as HTMLInputElement
    expect(field.tabIndex).toBe(-1)
    expect(field.getAttribute('autocomplete')).toBe('off')
    const wrapper = field.parentElement as HTMLElement
    expect(wrapper.getAttribute('aria-hidden')).toBe('true')
    expect(wrapper.style.left).toBe('-10000px')
    expect(screen.queryByRole('textbox', { name: 'Website' })).toBeNull()
  })

  it('Try again, Use a different email and Add another address each report their intent', () => {
    const h = handlers()
    const { unmount } = render(
      <EarlyAccessFragment
        {...earlyAccessFragmentProps(EarlyAccessMocks.failedOffline)}
        {...h}
      />,
    )
    press(screen.getByRole('button', { name: 'Try again' }))
    expect(h.onDismissFailure).toHaveBeenCalledTimes(1)
    unmount()
    const h2 = handlers()
    const second = render(
      <EarlyAccessFragment
        {...earlyAccessFragmentProps(EarlyAccessMocks.failedAlreadyJoined)}
        {...h2}
      />,
    )
    press(screen.getByRole('button', { name: 'Use a different email' }))
    expect(h2.onStartOver).toHaveBeenCalledTimes(1)
    second.unmount()
    const h3 = handlers()
    render(
      <EarlyAccessFragment
        {...earlyAccessFragmentProps(
          EarlyAccessMocks.joined,
          'https://app.kro.example',
        )}
        {...h3}
      />,
    )
    press(screen.getByRole('button', { name: 'Add another address' }))
    press(screen.getByRole('link', { name: 'Open Kro for Web' }))
    expect(h3.onStartOver).toHaveBeenCalledTimes(1)
    expect(h3.onOpenHub).toHaveBeenCalledTimes(1)
    expect(
      screen
        .getByRole('link', { name: 'Open Kro for Web' })
        .getAttribute('href'),
    ).toBe('https://app.kro.example')
  })
})
