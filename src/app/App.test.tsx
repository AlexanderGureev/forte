import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { createInitialAppState, useAppStore } from '../state/app-state';
import { CAMERA_ZOOM_STEP, DEFAULT_CAMERA_ZOOM } from '../state/view-settings';
import { createMidiPressedNote } from '../music/midi-notes';
import type { MidiInputDevice } from '../midi/types';

const midiControllerMock = vi.hoisted(() => ({
  requestAccess: vi.fn<() => Promise<void>>(),
  selectInput: vi.fn<(inputId: string) => void>(),
  disconnect: vi.fn<() => void>()
}));

vi.mock('../scene/PianoStudioScene', () => ({
  PianoStudioScene: ({
    chordEchoEnabled,
    cameraZoom
  }: {
    readonly chordEchoEnabled: boolean;
    readonly cameraZoom: number;
  }) => (
    <div
      data-testid="studio-scene"
      data-camera-zoom={String(cameraZoom)}
      data-chord-echo-enabled={String(chordEchoEnabled)}
    />
  )
}));

vi.mock('../midi/useMidiController', () => ({
  useMidiController: () => midiControllerMock
}));

const inputOne: MidiInputDevice = {
  id: 'input-one',
  name: 'Stage Piano',
  manufacturer: null,
  connected: true
};

const inputTwo: MidiInputDevice = {
  id: 'input-two',
  name: 'Control Keyboard',
  manufacturer: 'Acme',
  connected: true
};

describe('App', () => {
  beforeEach(() => {
    useAppStore.setState(createInitialAppState(), false);
    midiControllerMock.requestAccess.mockReset();
    midiControllerMock.selectInput.mockReset();
    midiControllerMock.disconnect.mockReset();
    midiControllerMock.requestAccess.mockResolvedValue(undefined);
    midiControllerMock.selectInput.mockImplementation((inputId) => {
      useAppStore.getState().setMidiConnected(inputId, useAppStore.getState().midi.inputs);
    });
    midiControllerMock.disconnect.mockImplementation(() => {
      useAppStore.getState().disconnectMidiInput();
    });
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

  it('shows the desktop MIDI button and requests access only from the panel action', () => {
    renderDesktopApp();

    const midiButton = screen.getByRole('button', { name: 'MIDI' });

    expect(midiButton).toBeTruthy();
    expect(midiControllerMock.requestAccess).not.toHaveBeenCalled();

    fireEvent.click(midiButton);

    const dialog = screen.getByRole('dialog', { name: 'MIDI' });

    expect(dialog).toBeTruthy();
    expect(midiControllerMock.requestAccess).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Подключить' }));

    expect(midiControllerMock.requestAccess).toHaveBeenCalledTimes(1);
  });

  it('shows the compact MIDI button in the bottom toolbar and opens the sheet', () => {
    setViewportWidth(640);
    render(<App />);

    const toolbar = screen.getByRole('navigation', { name: 'Панели управления' });
    const midiButton = within(toolbar).getByRole('button', { name: 'MIDI' });

    expect(midiButton).toBeTruthy();

    fireEvent.click(midiButton);

    expect(screen.getByRole('dialog', { name: 'MIDI' })).toBeTruthy();
  });

  it.each([
    [
      'unsupported',
      () => useAppStore.getState().setMidiUnsupported('Not supported.'),
      'MIDI не поддерживается этим браузером'
    ],
    [
      'permission denied',
      () => useAppStore.getState().setMidiPermissionDenied('Permission denied.'),
      'Разрешение на MIDI отклонено'
    ],
    ['no inputs', () => useAppStore.getState().setMidiNoInputs(), 'Устройство не найдено'],
    [
      'disconnected',
      () => useAppStore.getState().setMidiDisconnected('Disconnected.', [inputTwo]),
      'Устройство отключено'
    ],
    ['error', () => useAppStore.getState().setMidiError('Adapter failed.'), 'Ошибка MIDI']
  ] as const)('renders the %s MIDI status message', (_label, setStatus, expectedMessage) => {
    setStatus();
    renderDesktopApp();

    fireEvent.click(screen.getByRole('button', { name: 'MIDI' }));

    expect(
      within(screen.getByRole('dialog', { name: 'MIDI' })).getByText(expectedMessage)
    ).toBeTruthy();
  });

  it('shows the auto-connected single input after the request action resolves', async () => {
    midiControllerMock.requestAccess.mockImplementation(async () => {
      useAppStore.getState().setMidiRequesting();
      useAppStore.getState().setMidiConnected(inputOne.id, [inputOne]);
    });

    renderDesktopApp();
    fireEvent.click(screen.getByRole('button', { name: 'MIDI' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'MIDI' })).getByRole('button', {
        name: 'Подключить'
      })
    );

    expect(await screen.findByText('Подключено: Stage Piano')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'MIDI' }));
    fireEvent.click(screen.getByRole('button', { name: 'MIDI' }));

    expect(midiControllerMock.requestAccess).toHaveBeenCalledTimes(1);
  });

  it('renders multiple MIDI inputs as selectable radio-like controls', () => {
    useAppStore.getState().setMidiReady([inputOne, inputTwo]);
    renderDesktopApp();

    fireEvent.click(screen.getByRole('button', { name: 'MIDI' }));

    const dialog = screen.getByRole('dialog', { name: 'MIDI' });
    const inputGroup = within(dialog).getByRole('radiogroup', { name: 'MIDI inputs' });

    expect(within(inputGroup).getAllByRole('radio')).toHaveLength(2);

    fireEvent.click(within(inputGroup).getByRole('radio', { name: /Control Keyboard/ }));

    expect(midiControllerMock.selectInput).toHaveBeenCalledWith(inputTwo.id);
  });

  it('disconnects through the MIDI panel, clears active notes and keeps the HUD usable', () => {
    useAppStore.getState().setMidiConnected(inputOne.id, [inputOne]);
    useAppStore
      .getState()
      .pressMidiNote(createMidiPressedNote({ midiNoteNumber: 60, velocity: 96 }));

    renderDesktopApp();
    fireEvent.click(screen.getByRole('button', { name: 'MIDI' }));
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'MIDI' })).getByRole('button', {
        name: 'Отключить'
      })
    );

    expect(midiControllerMock.disconnect).toHaveBeenCalledTimes(1);
    expect(useAppStore.getState().midi.activeNotes).toEqual([]);
    expect(screen.getByLabelText('Ноты гаммы')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Фокус' })).toBeTruthy();
  });

  it('keeps the ScaleStrip and ScoreStaff rendering according to the selected mode', async () => {
    renderDesktopApp();

    expect(screen.getByLabelText('Ноты гаммы')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'MIDI' }));

    expect(screen.getByLabelText('Ноты гаммы')).toBeTruthy();

    act(() => {
      useAppStore.getState().setScaleDisplayMode('staffPractice');
    });

    expect(
      await screen.findByRole('img', {
        name: 'Партитура гаммы C Major, режим Практика'
      })
    ).toBeTruthy();
    expect(screen.queryByLabelText('Ноты гаммы')).toBeNull();
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

  it('keeps only progression cards and the bottom scale visible in focus mode', () => {
    renderDesktopApp();

    fireEvent.click(screen.getByRole('button', { name: 'Фокус' }));

    expect(screen.queryByRole('heading', { name: 'C Major' })).toBeNull();
    expect(screen.queryByText('Прогрессия')).toBeNull();
    expect(screen.queryByRole('group', { name: 'Пресеты прогрессий' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'MIDI' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Теория' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Фокус' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    expect(screen.getByRole('button', { name: 'Выбрать шаг 1: C, ступень I' })).toBeTruthy();
    expect(screen.getByLabelText('Ноты гаммы')).toBeTruthy();
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
    expect(
      within(settings).getByRole('slider', { name: 'Масштаб камеры' })
    ).toBeTruthy();
  });

  it('changes the camera zoom from the desktop View menu and resets it', () => {
    renderDesktopApp();

    expect(screen.getByTestId('studio-scene').getAttribute('data-camera-zoom')).toBe(
      String(DEFAULT_CAMERA_ZOOM)
    );

    const viewMenu = getDesktopViewMenu();
    const cameraZoomControl = within(viewMenu).getByRole('group', {
      name: 'Масштаб камеры'
    });
    const slider = within(cameraZoomControl).getByRole('slider', {
      name: 'Масштаб камеры'
    }) as HTMLInputElement;

    expect(slider.value).toBe(String(DEFAULT_CAMERA_ZOOM));

    fireEvent.click(within(cameraZoomControl).getByRole('button', { name: 'Приблизить камеру' }));

    expect(useAppStore.getState().cameraZoom).toBe(DEFAULT_CAMERA_ZOOM + CAMERA_ZOOM_STEP);
    expect(screen.getByTestId('studio-scene').getAttribute('data-camera-zoom')).toBe(
      String(DEFAULT_CAMERA_ZOOM + CAMERA_ZOOM_STEP)
    );

    fireEvent.change(slider, { target: { value: '0.85' } });

    expect(useAppStore.getState().cameraZoom).toBe(0.85);

    fireEvent.click(
      within(cameraZoomControl).getByRole('button', { name: 'Сбросить масштаб камеры' })
    );

    expect(useAppStore.getState().cameraZoom).toBe(DEFAULT_CAMERA_ZOOM);
    expect(screen.getByTestId('studio-scene').getAttribute('data-camera-zoom')).toBe(
      String(DEFAULT_CAMERA_ZOOM)
    );
  });

  it('keeps muted chord duplicates hidden by default and enables them from View', () => {
    renderDesktopApp();

    expect(screen.getByTestId('studio-scene').getAttribute('data-chord-echo-enabled')).toBe(
      'false'
    );

    const viewMenu = getDesktopViewMenu();
    const chordDuplicates = within(viewMenu).getByRole('button', { name: 'Дубли аккорда' });

    expect(chordDuplicates.getAttribute('aria-pressed')).toBe('false');

    fireEvent.click(chordDuplicates);

    expect(useAppStore.getState().chordEchoEnabled).toBe(true);
    expect(chordDuplicates.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('studio-scene').getAttribute('data-chord-echo-enabled')).toBe(
      'true'
    );
  });

  it('removes rendered improvisation active-chord highlights when Scale only is enabled', async () => {
    const { container } = renderDesktopApp();
    const viewMenu = getDesktopViewMenu();
    const scaleDisplayControl = within(viewMenu).getByRole('group', { name: 'Вид гаммы' });

    fireEvent.click(within(scaleDisplayControl).getByRole('button', { name: 'Импровизация' }));

    await screen.findByRole('img', {
      name: 'Партитура гаммы C Major, режим Импровизация'
    });
    await waitForRenderedScore(container);

    expect(activeChordScoreLabels(container).length).toBeGreaterThan(0);

    fireEvent.click(within(viewMenu).getByRole('button', { name: 'Только гамма' }));

    await waitFor(() => {
      expect(activeChordScoreLabels(container)).toHaveLength(0);
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

    expect(activeChordScoreLabels(container)).toHaveLength(0);
    expect(fingeredScoreLabels(container)).toHaveLength(0);

    fireEvent.click(within(viewMenu).getByRole('button', { name: 'Аппликатура' }));

    await waitFor(() => {
      expect(fingeredScoreLabels(container).length).toBeGreaterThan(0);
    });
    expect(activeChordScoreLabels(container)).toHaveLength(0);

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

function activeChordScoreLabels(container: HTMLElement): NodeListOf<Element> {
  return container.querySelectorAll(
    '.hud-score-staff__label[data-highlight-layers~="activeChord"]'
  );
}

function fingeredScoreLabels(container: HTMLElement): NodeListOf<Element> {
  return container.querySelectorAll(
    '.hud-score-staff__label[data-finger]:not([data-finger="none"])'
  );
}
