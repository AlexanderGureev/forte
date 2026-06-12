import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { createInitialAppState, useAppStore } from '../state/app-state';

vi.mock('../scene/PianoStudioScene', () => ({
  PianoStudioScene: () => <div data-testid="studio-scene" />
}));

describe('App', () => {
  beforeEach(() => {
    useAppStore.setState(createInitialAppState(), false);
    setViewportWidth(1024);
  });

  it('renders the studio workspace with the default C Major key and scale strip', () => {
    render(<App />);

    expect(screen.getByTestId('studio-scene')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'C Major' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Теория' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Фокус' })).toBeTruthy();
    expect(screen.getByLabelText('Ноты гаммы')).toBeTruthy();
    expect(screen.queryByRole('img', { name: /Партитура гаммы/ })).toBeNull();
  });

  it('switches the desktop View menu scale display control to improvisation score', async () => {
    const { container } = renderDesktopApp();
    const scaleDisplayControl = getDesktopScaleDisplayControl();
    const options = within(scaleDisplayControl).getAllByRole('button');

    expect(options.map((option) => option.textContent)).toEqual([
      'Плашка',
      'Импровизация',
      'Практика'
    ]);
    expect(
      within(scaleDisplayControl)
        .getByRole('button', { name: 'Плашка' })
        .getAttribute('aria-pressed')
    ).toBe('true');

    fireEvent.click(within(scaleDisplayControl).getByRole('button', { name: 'Импровизация' }));

    expect(useAppStore.getState().scaleDisplayMode).toBe('staffImprovisation');
    expect(
      await screen.findByRole('img', {
        name: 'Партитура гаммы C Major, режим Импровизация'
      })
    ).toBeTruthy();
    expect(screen.queryByLabelText('Ноты гаммы')).toBeNull();

    await waitForRenderedScore(container);

    fireEvent.click(screen.getByRole('button', { name: 'Подробнее о гамме' }));

    expect(screen.getByRole('dialog', { name: 'C Major' }).getAttribute('data-context-target')).toBe(
      'scale'
    );
  });

  it('keeps the selected score visible in focus mode', async () => {
    renderDesktopApp();
    const scaleDisplayControl = getDesktopScaleDisplayControl();

    fireEvent.click(within(scaleDisplayControl).getByRole('button', { name: 'Практика' }));

    expect(
      await screen.findByRole('img', {
        name: 'Партитура гаммы C Major, режим Практика'
      })
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Фокус' }));

    expect(
      screen.getByRole('img', {
        name: 'Партитура гаммы C Major, режим Практика'
      })
    ).toBeTruthy();
  });

  it('shows the same scale display options in the compact view settings sheet', () => {
    setViewportWidth(640);
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Тональность' }));

    const dialog = screen.getByRole('dialog', { name: 'Выбор тональности' });
    const settings = within(dialog).getByRole('region', { name: 'Настройки вида' });
    const scaleDisplayControl = within(settings).getByRole('group', { name: 'Вид гаммы' });

    expect(
      within(scaleDisplayControl)
        .getAllByRole('button')
        .map((option) => option.textContent)
    ).toEqual(['Плашка', 'Импровизация', 'Практика']);
  });

  it('removes rendered improvisation highlights when Scale only is enabled', async () => {
    const { container } = renderDesktopApp();
    const viewMenu = getDesktopViewMenu();
    const scaleDisplayControl = within(viewMenu).getByRole('group', { name: 'Вид гаммы' });

    fireEvent.click(within(scaleDisplayControl).getByRole('button', { name: 'Импровизация' }));

    await screen.findByRole('img', {
      name: 'Партитура гаммы C Major, режим Импровизация'
    });
    await waitForRenderedScore(container);

    expect(highlightedScoreLabels(container).length).toBeGreaterThan(0);

    fireEvent.click(within(viewMenu).getByRole('button', { name: 'Только гамма' }));

    await waitFor(() => {
      expect(highlightedScoreLabels(container)).toHaveLength(0);
    });
  });

  it('renders practice fingers only after fingering is enabled and not in improvisation', async () => {
    const { container } = renderDesktopApp();
    const viewMenu = getDesktopViewMenu();
    const scaleDisplayControl = within(viewMenu).getByRole('group', { name: 'Вид гаммы' });

    fireEvent.click(within(scaleDisplayControl).getByRole('button', { name: 'Практика' }));

    await screen.findByRole('img', {
      name: 'Партитура гаммы C Major, режим Практика'
    });
    await waitForRenderedScore(container);

    expect(highlightedScoreLabels(container)).toHaveLength(0);
    expect(fingeredScoreLabels(container)).toHaveLength(0);

    fireEvent.click(within(viewMenu).getByRole('button', { name: 'Аппликатура' }));

    await waitFor(() => {
      expect(fingeredScoreLabels(container).length).toBeGreaterThan(0);
    });
    expect(highlightedScoreLabels(container)).toHaveLength(0);

    fireEvent.click(within(scaleDisplayControl).getByRole('button', { name: 'Импровизация' }));

    await screen.findByRole('img', {
      name: 'Партитура гаммы C Major, режим Импровизация'
    });

    await waitFor(() => {
      expect(fingeredScoreLabels(container)).toHaveLength(0);
    });
  });
});

function renderDesktopApp() {
  setViewportWidth(1280);

  return render(<App />);
}

function getDesktopViewMenu(): HTMLElement {
  fireEvent.click(screen.getByRole('button', { name: 'Вид' }));

  return screen.getByRole('group', { name: 'Настройки вида' });
}

function getDesktopScaleDisplayControl(): HTMLElement {
  return within(getDesktopViewMenu()).getByRole('group', { name: 'Вид гаммы' });
}

function setViewportWidth(width: number): void {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width
  });
  window.dispatchEvent(new Event('resize'));
}

async function waitForRenderedScore(container: HTMLElement): Promise<void> {
  await waitFor(() => {
    expect(container.querySelectorAll('.hud-score-staff__renderer svg')).toHaveLength(1);
  });
}

function highlightedScoreLabels(container: HTMLElement): NodeListOf<Element> {
  return container.querySelectorAll('.hud-score-staff__label[data-highlighted="true"]');
}

function fingeredScoreLabels(container: HTMLElement): NodeListOf<Element> {
  return container.querySelectorAll(
    '.hud-score-staff__label[data-finger]:not([data-finger="none"])'
  );
}
