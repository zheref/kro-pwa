/**
 * Small DOM helpers for the landing suites (this package ships no jest-dom).
 */
import { fireEvent } from '@testing-library/react'

/**
 * Click an element without letting jsdom attempt a real navigation (a link to
 * `/my-day` would log "Not implemented: navigation").
 */
export function press(element: Element): void {
  element.addEventListener('click', (event) => event.preventDefault(), {
    once: true,
  })
  fireEvent.click(element)
}
