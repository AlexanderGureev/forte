import { getRelativeKey } from './progressions';
import { PHYSICAL_PITCH_CLASSES, isBlackKeyPitchClass } from './note-spelling';
import type {
  ColorLegendItem,
  DegreeLabel,
  DiatonicChord,
  KeyboardHighlightLayer,
  KeyboardKeyViewModel,
  KeyboardViewModel,
  KeyboardViewModelInput,
  KeyDefinition,
  KeySignature,
  LabelMode,
  Mode,
  PhysicalPitchClass,
  Scale,
  ScaleDegree,
  ScaleNote,
  TheoryOverlayContextTarget,
  TheoryOverlayInput,
  TheoryOverlayModel,
  TheoryOverlayRow,
  TheoryOverlaySection,
  TheoryOverlaySectionId
} from './types';

const DEFAULT_START_OCTAVE = 3;

const DEGREE_LABELS = {
  major: {
    1: '1',
    2: '2',
    3: '3',
    4: '4',
    5: '5',
    6: '6',
    7: '7'
  },
  naturalMinor: {
    1: '1',
    2: '2',
    3: 'b3',
    4: '4',
    5: '5',
    6: 'b6',
    7: 'b7'
  }
} as const satisfies Record<Mode, Record<ScaleDegree, DegreeLabel>>;

export function formatScaleDegreeLabel(mode: Mode, degree: ScaleDegree): DegreeLabel {
  return DEGREE_LABELS[mode][degree];
}

export function createKeyboardViewModel(input: KeyboardViewModelInput): KeyboardViewModel {
  const octaveCount = input.viewport === 'mobile' ? 2 : 3;
  const startOctave = input.startOctave ?? DEFAULT_START_OCTAVE;
  const scaleNoteByPitchClass = new Map(
    input.scale.notes.map((note) => [note.physicalPitchClass, note])
  );
  const activeChordPitchClasses = new Set(
    input.activeChord?.notes.map((note) => note.physicalPitchClass) ?? []
  );

  const keys = Array.from({ length: octaveCount * PHYSICAL_PITCH_CLASSES.length }, (_, index) => {
    const physicalPitchClass = PHYSICAL_PITCH_CLASSES[index % PHYSICAL_PITCH_CLASSES.length];
    const octave = startOctave + Math.floor(index / PHYSICAL_PITCH_CLASSES.length);
    const scaleNote = scaleNoteByPitchClass.get(physicalPitchClass) ?? null;
    const isBlackKey = isBlackKeyPitchClass(physicalPitchClass);
    const degreeLabel =
      scaleNote === null ? null : formatScaleDegreeLabel(input.key.mode, scaleNote.degree);
    const highlightLayers = getKeyboardHighlightLayers({
      key: input.key,
      physicalPitchClass,
      scaleNote,
      activeChord: input.activeChord,
      activeChordPitchClasses,
      chordLayerEnabled: input.chordLayerEnabled
    });

    return {
      id: `${physicalPitchClass}-${octave}`,
      physicalPitchClass,
      octave,
      isWhiteKey: !isBlackKey,
      isBlackKey,
      scaleNote,
      noteLabel: scaleNote?.name ?? null,
      degreeLabel,
      visibleLabel: getVisibleKeyLabel({
        scaleNote,
        degreeLabel,
        labelMode: input.labelMode,
        labelsVisible: input.labelsVisible
      }),
      highlightLayers
    } satisfies KeyboardKeyViewModel;
  });

  return {
    viewport: input.viewport,
    startOctave,
    octaveCount,
    keys
  };
}

export function createTheoryOverlayModel(input: TheoryOverlayInput): TheoryOverlayModel {
  const relativeKey = getRelativeKey(input.key);
  const sections = [
    createSection(input.contextTarget, 'key', 'Тональность', [
      { label: 'Название', value: input.key.displayName },
      { label: 'Лад', value: formatMode(input.key.mode) },
      { label: 'Сложность', value: formatDifficulty(input.key.difficulty) }
    ]),
    createSection(input.contextTarget, 'scaleFormula', 'Формула гаммы', [
      { label: 'Шаги', value: formatScaleFormula(input.scale.formula) }
    ]),
    createSection(
      input.contextTarget,
      'scaleNotes',
      'Ноты гаммы',
      [],
      input.scale.notes.map(
        (note) => `${formatScaleDegreeLabel(input.key.mode, note.degree)}: ${note.name}`
      )
    ),
    createSection(input.contextTarget, 'keySignature', 'Знаки при ключе', [
      { label: 'Тип', value: formatKeySignatureType(input.key.keySignature) },
      { label: 'Количество', value: String(input.key.keySignature.count) },
      { label: 'Ноты', value: formatKeySignatureNotes(input.key.keySignature) }
    ]),
    createSection(
      input.contextTarget,
      'diatonicChords',
      'Диатонические аккорды',
      [],
      input.chords.map(formatChord)
    ),
    createSection(input.contextTarget, 'activeChord', 'Активный аккорд', [
      { label: 'Аккорд', value: input.activeChord?.name ?? 'Нет' },
      { label: 'Ступень', value: input.activeChord?.romanDegree ?? 'Нет' },
      { label: 'Источник', value: formatActiveChordSource(input.activeChordSource) },
      {
        label: 'Шаг прогрессии',
        value:
          input.activeProgressionStepIndex === null
            ? 'Нет'
            : String(input.activeProgressionStepIndex + 1)
      }
    ]),
    createSection(input.contextTarget, 'progression', 'Прогрессия', [
      { label: 'Название', value: input.progression.name },
      {
        label: 'Ступени',
        value: input.progression.steps.map((step) => step.romanDegree).join(' - ')
      }
    ]),
    createSection(input.contextTarget, 'relativeKey', 'Относительная тональность', [
      { label: 'Связь', value: formatRelativeRelationship(relativeKey.relationship) },
      { label: 'Тональность', value: relativeKey.key.displayName }
    ]),
    createSection(
      input.contextTarget,
      'colorLegend',
      'Легенда цветов',
      [],
      input.colorLegend.map(formatColorLegendItem)
    )
  ] satisfies readonly TheoryOverlaySection[];

  return {
    isOpen: input.isOpen,
    contextTarget: input.contextTarget,
    key: input.key,
    relativeKey,
    sections
  };
}

function getKeyboardHighlightLayers(input: {
  readonly key: KeyDefinition;
  readonly physicalPitchClass: PhysicalPitchClass;
  readonly scaleNote: ScaleNote | null;
  readonly activeChord: DiatonicChord | null;
  readonly activeChordPitchClasses: ReadonlySet<PhysicalPitchClass>;
  readonly chordLayerEnabled: boolean;
}): readonly KeyboardHighlightLayer[] {
  const highlightLayers: KeyboardHighlightLayer[] = [];

  if (input.scaleNote !== null) {
    highlightLayers.push('inScale');
  }

  if (input.physicalPitchClass === input.key.physicalPitchClass) {
    highlightLayers.push('tonic');
  }

  if (
    input.chordLayerEnabled &&
    input.activeChord !== null &&
    input.activeChordPitchClasses.has(input.physicalPitchClass)
  ) {
    highlightLayers.push('activeChord');

    if (input.activeChord.quality === 'diminished') {
      highlightLayers.push('diminished');
    }
  }

  return highlightLayers;
}

function getVisibleKeyLabel(input: {
  readonly scaleNote: ScaleNote | null;
  readonly degreeLabel: DegreeLabel | null;
  readonly labelMode: LabelMode;
  readonly labelsVisible: boolean;
}): string | null {
  if (!input.labelsVisible || input.scaleNote === null) {
    return null;
  }

  return input.labelMode === 'notes' ? input.scaleNote.name : input.degreeLabel;
}

function createSection(
  contextTarget: TheoryOverlayContextTarget | null,
  id: TheoryOverlaySectionId,
  title: string,
  rows: readonly TheoryOverlayRow[],
  items: readonly string[] = []
): TheoryOverlaySection {
  return {
    id,
    title,
    rows,
    items,
    highlighted: isSectionHighlighted(id, contextTarget)
  };
}

function isSectionHighlighted(
  id: TheoryOverlaySectionId,
  contextTarget: TheoryOverlayContextTarget | null
): boolean {
  if (contextTarget === null) {
    return false;
  }

  if (contextTarget === 'key') {
    return id === 'key' || id === 'keySignature' || id === 'relativeKey';
  }

  if (contextTarget === 'scale') {
    return id === 'scaleFormula' || id === 'scaleNotes';
  }

  if (contextTarget === 'chords') {
    return id === 'diatonicChords';
  }

  if (contextTarget === 'keyboard') {
    return id === 'scaleNotes' || id === 'colorLegend';
  }

  return id === contextTarget;
}

function formatMode(mode: Mode): string {
  return mode === 'major' ? 'Мажор' : 'Натуральный минор';
}

function formatDifficulty(difficulty: KeyDefinition['difficulty']): string {
  if (difficulty === 'easy') {
    return 'легкая';
  }

  return difficulty === 'medium' ? 'средняя' : 'сложная';
}

/** W/H → привычные в русской теории обозначения: тон/полутон. */
function formatScaleFormula(formula: Scale['formula']): string {
  return formula.map((step) => (step === 'W' ? 'Т' : 'П')).join(' – ');
}

function formatKeySignatureType(keySignature: KeySignature): string {
  if (keySignature.accidental === 'natural') {
    return 'нет знаков';
  }

  return keySignature.accidental === 'sharp' ? 'диезы (#)' : 'бемоли (b)';
}

function formatKeySignatureNotes(keySignature: KeySignature): string {
  return keySignature.notes.length === 0 ? 'нет' : keySignature.notes.join(', ');
}

function formatChord(chord: DiatonicChord): string {
  return `${chord.romanDegree}: ${chord.name} (${chord.notes
    .map((note) => note.name)
    .join(', ')})`;
}

function formatActiveChordSource(source: TheoryOverlayInput['activeChordSource']): string {
  if (source === 'progression') {
    return 'Прогрессия';
  }

  if (source === 'manual') {
    return 'Ручной выбор';
  }

  return 'Нет';
}

function formatRelativeRelationship(
  relationship: ReturnType<typeof getRelativeKey>['relationship']
): string {
  return relationship === 'relativeMinor' ? 'Параллельный минор' : 'Параллельный мажор';
}

function formatColorLegendItem(item: ColorLegendItem): string {
  return `${item.label}: ${item.description}`;
}
