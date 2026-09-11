import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Input } from '../../system/primitives/input'
import { Field } from './Field'

afterEach(cleanup)

describe('Field', () => {
  it('names the group from the label and wraps the control', () => {
    render(
      <Field label="Session title" htmlFor="session-title">
        <Input id="session-title" />
      </Field>,
    )

    const group = screen.getByRole('group', { name: 'Session title' })
    expect(group.getAttribute('data-slot')).toBe('field')
    expect(group.getAttribute('data-orientation')).toBe('vertical')
    expect(group.getAttribute('data-validation')).toBe('none')
    expect(document.getElementById('session-title')).toBeTruthy()
  })

  it('marks required with a hidden star and the word required', () => {
    render(
      <Field label="Session title" required>
        <Input />
      </Field>,
    )

    const star = screen.getByText('*')
    expect(star.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByText(/required/).className).toContain('sr-only')
    expect(
      screen.getByRole('group', { name: 'Session title required' }),
    ).toBeTruthy()
  })

  it('names an error in words, never colour alone', () => {
    render(
      <Field
        label="Session title"
        validationState="error"
        validationMessage="A title is required before this can be saved."
      >
        <Input />
      </Field>,
    )

    const message = screen.getByRole('alert')
    expect(message.textContent).toBe(
      'A title is required before this can be saved.',
    )
    expect(message.className).toContain('text-kro-banner-danger')
  })

  it('tints warning and success only after the words are present', () => {
    const { rerender } = render(
      <Field
        label="Host"
        validationState="warning"
        validationMessage="This host is read-only."
      >
        <Input />
      </Field>,
    )

    const warning = screen.getByText('This host is read-only.')
    expect(warning.className).toContain('text-kro-banner-warning')
    expect(warning.getAttribute('role')).toBeNull()

    rerender(
      <Field
        label="Host"
        validationState="success"
        validationMessage="Saved to the plan."
      >
        <Input />
      </Field>,
    )
    const success = screen.getByText('Saved to the plan.')
    expect(success.className).toContain('text-kro-focus-green')
  })

  it('hides a message when validation is none, and lays out horizontally', () => {
    render(
      <Field
        label="When"
        hint="Optional"
        orientation="horizontal"
        validationState="none"
        validationMessage="Should not show."
      >
        <Input />
      </Field>,
    )

    const group = screen.getByRole('group', { name: 'When' })
    expect(group.getAttribute('data-orientation')).toBe('horizontal')
    expect(group.className).toContain('flex-row')
    expect(screen.getByText('Optional')).toBeTruthy()
    expect(screen.queryByText('Should not show.')).toBeNull()
  })

  it('maps Fluent sizes onto Kro density', () => {
    const { rerender } = render(
      <Field label="Title" size="small">
        <Input />
      </Field>,
    )
    expect(screen.getByRole('group').getAttribute('data-density')).toBe(
      'compact',
    )

    rerender(
      <Field label="Title" size="large">
        <Input />
      </Field>,
    )
    expect(screen.getByRole('group').getAttribute('data-density')).toBe(
      'comfortable',
    )
  })
})
