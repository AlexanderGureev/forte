import type { MidiRuntimeState } from '../../state/app-state';
import type { MidiInputDevice } from '../../midi/types';

export interface MidiPanelProps {
  readonly midi: MidiRuntimeState;
  readonly onRequestAccess: () => void | Promise<void>;
  readonly onSelectInput: (inputId: string) => void;
  readonly onDisconnect: () => void;
  readonly showTitle?: boolean;
}

interface PrimaryAction {
  readonly label: string;
  readonly onClick: () => void | Promise<void>;
  readonly disabled?: boolean;
}

export function MidiPanel({
  midi,
  onRequestAccess,
  onSelectInput,
  onDisconnect,
  showTitle = true
}: MidiPanelProps) {
  const selectedInput = getSelectedInput(midi);
  const primaryAction = getPrimaryAction(midi, onRequestAccess, onSelectInput);
  const showInputList = midi.inputs.length > 1;

  return (
    <div className="midi-panel" data-status={midi.status}>
      <header className="midi-panel__header">
        {showTitle ? <span className="hud-eyebrow">MIDI</span> : null}
        <p className="midi-panel__status" aria-live="polite">
          {formatStatusMessage(midi, selectedInput)}
        </p>
      </header>

      {selectedInput === null ? null : (
        <p className="midi-panel__selected">Выбрано: {selectedInput.name}</p>
      )}

      {showInputList ? (
        <div className="midi-panel__inputs" role="radiogroup" aria-label="MIDI inputs">
          {midi.inputs.map((input) => {
            const selected = input.id === midi.selectedInputId;

            return (
              <button
                key={input.id}
                className="midi-panel__input"
                type="button"
                role="radio"
                aria-checked={selected}
                data-selected={selected ? 'true' : 'false'}
                onClick={() => onSelectInput(input.id)}
              >
                <span className="midi-panel__input-name">{input.name}</span>
                {input.manufacturer === null ? null : (
                  <span className="midi-panel__input-meta">{input.manufacturer}</span>
                )}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="midi-panel__actions">
        {primaryAction === null ? null : (
          <button
            className="hud-action"
            type="button"
            disabled={primaryAction.disabled}
            onClick={() => {
              void primaryAction.onClick();
            }}
          >
            {primaryAction.label}
          </button>
        )}
        {midi.status === 'connected' ? (
          <button className="hud-action" type="button" onClick={onDisconnect}>
            Отключить
          </button>
        ) : null}
      </div>
    </div>
  );
}

function getSelectedInput(midi: MidiRuntimeState): MidiInputDevice | null {
  if (midi.selectedInputId === null) {
    return null;
  }

  return midi.inputs.find((input) => input.id === midi.selectedInputId) ?? null;
}

function getPrimaryAction(
  midi: MidiRuntimeState,
  onRequestAccess: () => void | Promise<void>,
  onSelectInput: (inputId: string) => void
): PrimaryAction | null {
  if (midi.status === 'requesting') {
    return {
      label: 'Подключение',
      onClick: onRequestAccess,
      disabled: true
    };
  }

  if (midi.status === 'idle') {
    return {
      label: 'Подключить',
      onClick: onRequestAccess
    };
  }

  if (
    midi.status === 'noInputs' ||
    midi.status === 'permissionDenied' ||
    midi.status === 'disconnected' ||
    midi.status === 'error'
  ) {
    return {
      label: 'Повторить',
      onClick: onRequestAccess
    };
  }

  if (midi.status === 'ready' && midi.inputs.length === 0) {
    return {
      label: 'Обновить',
      onClick: onRequestAccess
    };
  }

  if (midi.status === 'ready' && midi.inputs.length === 1) {
    return {
      label: 'Подключить',
      onClick: () => onSelectInput(midi.inputs[0].id)
    };
  }

  return null;
}

function formatStatusMessage(
  midi: MidiRuntimeState,
  selectedInput: MidiInputDevice | null
): string {
  switch (midi.status) {
    case 'idle':
      return 'MIDI не подключен';
    case 'requesting':
      return 'Запрос доступа к MIDI';
    case 'ready':
      return midi.inputs.length > 1 ? 'Выберите устройство' : formatReadyMessage(midi.inputs);
    case 'connected':
      return `Подключено: ${selectedInput?.name ?? 'устройство'}`;
    case 'unsupported':
      return 'MIDI не поддерживается этим браузером';
    case 'permissionDenied':
      return 'Разрешение на MIDI отклонено';
    case 'noInputs':
      return 'Устройство не найдено';
    case 'disconnected':
      return 'Устройство отключено';
    case 'error':
      return 'Ошибка MIDI';
  }
}

function formatReadyMessage(inputs: readonly MidiInputDevice[]): string {
  if (inputs.length === 0) {
    return 'MIDI готов';
  }

  return `Доступно: ${inputs[0].name}`;
}
