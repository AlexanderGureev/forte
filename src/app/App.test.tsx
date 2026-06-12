import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { App } from './App';

vi.mock('../scene/PianoStudioScene', () => ({
  PianoStudioScene: () => <div data-testid="studio-scene" />
}));

describe('App', () => {
  it('renders the studio workspace with the default C Major key', () => {
    render(<App />);

    expect(screen.getByTestId('studio-scene')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'C Major' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Теория' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Фокус' })).toBeTruthy();
  });
});
