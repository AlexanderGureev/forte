import { SegmentedControl } from '../primitives';
import type { LabelMode } from '../../music/types';

export interface LabelModeControlProps {
  readonly labelsVisible: boolean;
  readonly labelMode: LabelMode;
  readonly onToggleLabels: () => void;
  readonly onSelectLabelMode: (labelMode: LabelMode) => void;
  readonly className?: string;
}

type LabelChoice = LabelMode | 'hidden';

/** Единый переключатель подписей клавиш: ноты / ступени / скрыть. */
export function LabelModeControl({
  labelsVisible,
  labelMode,
  onToggleLabels,
  onSelectLabelMode,
  className
}: LabelModeControlProps) {
  const value: LabelChoice = labelsVisible ? labelMode : 'hidden';

  const handleChange = (choice: LabelChoice) => {
    if (choice === 'hidden') {
      if (labelsVisible) {
        onToggleLabels();
      }
      return;
    }

    if (!labelsVisible) {
      onToggleLabels();
    }

    if (choice !== labelMode) {
      onSelectLabelMode(choice);
    }
  };

  return (
    <SegmentedControl<LabelChoice>
      label="Подписи клавиш"
      value={value}
      options={[
        { value: 'notes', label: 'Ноты' },
        { value: 'degrees', label: 'Ступени' },
        { value: 'hidden', label: 'Скрыть' }
      ]}
      onChange={handleChange}
      className={className}
    />
  );
}
