import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import Home from './page'

describe('Home Page', () => {
  it('should render the main page', () => {
    render(<Home />)
    expect(screen.getByText('Welcome to Kro.')).toBeInTheDocument()
  })
})
