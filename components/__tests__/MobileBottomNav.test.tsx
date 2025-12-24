import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import MobileBottomNav from '../MobileBottomNav';

describe('MobileBottomNav', () => {
  it('renders all navigation items', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MobileBottomNav />
      </MemoryRouter>
    );

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Payslips')).toBeInTheDocument();
    expect(screen.getByText('Leave')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
    expect(screen.getByText('Alerts')).toBeInTheDocument();
  });

  it('highlights active item based on current path', () => {
    render(
      <MemoryRouter initialEntries={['/payslips']}>
        <MobileBottomNav />
      </MemoryRouter>
    );

    const payslipsLink = screen.getByText('Payslips').closest('a');
    expect(payslipsLink).toHaveClass('bg-primary-light', 'text-primary');
  });

  it('calls onNavigate when a link is clicked', () => {
    const mockOnNavigate = vi.fn();
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <MobileBottomNav onNavigate={mockOnNavigate} />
      </MemoryRouter>
    );

    const profileLink = screen.getByText('Profile').closest('a');
    profileLink?.click();

    expect(mockOnNavigate).toHaveBeenCalledTimes(1);
  });
});