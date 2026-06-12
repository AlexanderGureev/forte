import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ColorLegend } from '../ColorLegend';

describe('ColorLegend', () => {
  it('renders the MIDI pressed swatch with a stable CSS data kind', () => {
    const { container } = render(
      <ColorLegend
        items={[
          {
            id: 'midiPressed',
            label: 'Нажато на MIDI',
            description: 'физически нажатая клавиша подключенной MIDI-клавиатуры'
          }
        ]}
        onOpenTheory={vi.fn()}
      />
    );

    expect(screen.getByText('Нажато на MIDI')).toBeTruthy();
    expect(container.querySelector('.hud-legend__swatch')?.getAttribute('data-kind')).toBe(
      'midiPressed'
    );
  });
});
