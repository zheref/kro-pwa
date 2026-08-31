import '@testing-library/jest-dom'
import { render, screen } from '@testing-library/react'
import Home from './page';


describe('Home Page', () => {
    it('should render the main page', () => {
        render(<Home />)
        expect(screen.getByText('Welcome to Kro.')).toBeInTheDocument();
    })
});