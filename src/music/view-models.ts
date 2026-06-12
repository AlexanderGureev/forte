import { getRelativeKey } from './progressions';
import { buildScaleFingering } from './fingerings';
import { PHYSICAL_PITCH_CLASSES, isBlackKeyPitchClass } from './note-spelling';
import type {
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
  PianoFinger,
  PhysicalPitchClass,
  Scale,
  ScaleDegree,
  ScaleFingering,
  ScaleFingeringDirection,
  ScaleFingeringHand,
  ScaleNote,
  ScoreStaffViewModel,
  TheoryOverlayContextTarget,
  TheoryOverlayInput,
  TheoryOverlayModel,
  TheoryOverlayRow,
  TheoryOverlaySection,
  TheoryOverlaySectionId
} from './types';

const DEFAULT_START_OCTAVE = 3;
const MIDDLE_C_PITCH = 4 * PHYSICAL_PITCH_CLASSES.length;
const PRACTICE_SLOT_COUNT = 15;

interface ActiveChordHighlight {
  readonly chord: DiatonicChord | null;
  readonly enabled: boolean;
  readonly pitchClasses: ReadonlySet<PhysicalPitchClass>;
}

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
  const activeChordHighlight = createActiveChordHighlight({
    activeChord: input.activeChord,
    chordLayerEnabled: input.chordLayerEnabled
  });
  const fingeringLabelByKeyId = getFingeringLabelByKeyId({
    fingering: input.scaleFingering,
    startOctave,
    octaveCount
  });

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
      activeChordHighlight
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
      fingeringLabel: fingeringLabelByKeyId.get(`${physicalPitchClass}-${octave}`) ?? null,
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

export function createScoreStaffViewModel(input: {
  readonly mode: ScoreStaffViewModel['mode'];
  readonly key: KeyDefinition;
  readonly scale: Scale;
  readonly keyboard: KeyboardViewModel;
  readonly activeChord: DiatonicChord | null;
  readonly chordLayerEnabled: boolean;
  readonly scaleFingeringEnabled: boolean;
}): ScoreStaffViewModel {
  if (input.mode === 'staffImprovisation') {
    return createStaffImprovisationViewModel(input);
  }

  return createStaffPracticeViewModel(input);
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
    createSection(
      input.contextTarget,
      'scaleFingering',
      'Аппликатура гаммы',
      buildScaleFingeringRows(input.scaleFingerings)
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
      input.chords.map((chord) => ({
        label: chord.romanDegree,
        value: `${chord.name} · ${chord.notes.map((note) => note.name).join(' - ')}`
      }))
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
      input.colorLegend.map((item) => ({ label: item.label, value: item.description }))
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
  readonly activeChordHighlight: ActiveChordHighlight;
}): readonly KeyboardHighlightLayer[] {
  const highlightLayers: KeyboardHighlightLayer[] = [];

  if (input.scaleNote !== null) {
    highlightLayers.push('inScale');
  }

  if (input.physicalPitchClass === input.key.physicalPitchClass) {
    highlightLayers.push('tonic');
  }

  if (isActiveChordHighlighted(input.activeChordHighlight, input.physicalPitchClass)) {
    highlightLayers.push('activeChord');

    if (input.activeChordHighlight.chord?.quality === 'diminished') {
      highlightLayers.push('diminished');
    }
  }

  return highlightLayers;
}

function createStaffImprovisationViewModel(input: {
  readonly mode: ScoreStaffViewModel['mode'];
  readonly key: KeyDefinition;
  readonly keyboard: KeyboardViewModel;
  readonly activeChord: DiatonicChord | null;
  readonly chordLayerEnabled: boolean;
}): ScoreStaffViewModel {
  const activeChordHighlight = createActiveChordHighlight({
    activeChord: input.activeChord,
    chordLayerEnabled: input.chordLayerEnabled
  });
  const notes = input.keyboard.keys.filter(hasScaleNote).map((key, slotIndex) =>
    createStaffNote({
      mode: input.mode,
      key: input.key,
      scaleNote: key.scaleNote,
      octave: key.octave,
      clef: getClefForPhysicalPitch(key.physicalPitchClass, key.octave),
      slotIndex,
      highlighted: isActiveChordHighlighted(activeChordHighlight, key.scaleNote.physicalPitchClass),
      finger: null
    })
  );

  return {
    mode: input.mode,
    key: input.key,
    keySignature: input.key.keySignature,
    slotCount: notes.length,
    lines: [
      {
        clef: 'treble',
        notes: notes.filter((note) => note.clef === 'treble')
      },
      {
        clef: 'bass',
        notes: notes.filter((note) => note.clef === 'bass')
      }
    ]
  };
}

function createStaffPracticeViewModel(input: {
  readonly key: KeyDefinition;
  readonly scale: Scale;
  readonly scaleFingeringEnabled: boolean;
}): ScoreStaffViewModel {
  const anchorOctave = getNearestTonicOctave(input.key.physicalPitchClass);
  const rightAscending = input.scaleFingeringEnabled
    ? buildScaleFingering({
        key: input.key,
        scale: input.scale,
        hand: 'right',
        direction: 'ascending'
      })
    : null;
  const leftDescending = input.scaleFingeringEnabled
    ? buildScaleFingering({
        key: input.key,
        scale: input.scale,
        hand: 'left',
        direction: 'descending'
      })
    : null;

  return {
    mode: 'staffPractice',
    key: input.key,
    keySignature: input.key.keySignature,
    slotCount: PRACTICE_SLOT_COUNT,
    lines: [
      {
        clef: 'treble',
        notes: createPracticeNotes({
          key: input.key,
          scale: input.scale,
          clef: 'treble',
          anchorOctave,
          direction: 'ascending',
          fingering: rightAscending
        })
      },
      {
        clef: 'bass',
        notes: createPracticeNotes({
          key: input.key,
          scale: input.scale,
          clef: 'bass',
          anchorOctave,
          direction: 'descending',
          fingering: leftDescending
        })
      }
    ]
  };
}

function hasScaleNote(
  key: KeyboardKeyViewModel
): key is KeyboardKeyViewModel & { readonly scaleNote: ScaleNote } {
  return key.scaleNote !== null;
}

function createPracticeNotes(input: {
  readonly key: KeyDefinition;
  readonly scale: Scale;
  readonly clef: ScoreStaffViewModel['lines'][number]['clef'];
  readonly anchorOctave: number;
  readonly direction: ScaleFingeringDirection;
  readonly fingering: ScaleFingering | null;
}): readonly ScoreStaffViewModel['lines'][number]['notes'][number][] {
  const ascendingPitches = createAscendingPracticePitches({
    key: input.key,
    scale: input.scale,
    anchorOctave: input.direction === 'ascending' ? input.anchorOctave : input.anchorOctave - 2
  });
  const pitches =
    input.direction === 'ascending' ? ascendingPitches : [...ascendingPitches].reverse();

  return pitches.map((pitch, slotIndex) =>
    createStaffNote({
      mode: 'staffPractice',
      key: input.key,
      scaleNote: pitch.scaleNote,
      octave: pitch.octave,
      clef: input.clef,
      slotIndex,
      highlighted: false,
      finger: getPracticeFinger(input.fingering, slotIndex)
    })
  );
}

function createAscendingPracticePitches(input: {
  readonly key: KeyDefinition;
  readonly scale: Scale;
  readonly anchorOctave: number;
}): readonly {
  readonly scaleNote: ScaleNote;
  readonly octave: number;
}[] {
  return Array.from({ length: PRACTICE_SLOT_COUNT }, (_, slotIndex) => {
    const scaleNote = input.scale.notes[slotIndex % input.scale.notes.length];
    const cycleIndex = Math.floor(slotIndex / input.scale.notes.length);
    const octave =
      input.anchorOctave +
      cycleIndex +
      (scaleNote.physicalPitchClass < input.key.physicalPitchClass ? 1 : 0);

    return {
      scaleNote,
      octave
    };
  });
}

function createStaffNote(input: {
  readonly mode: ScoreStaffViewModel['mode'];
  readonly key: KeyDefinition;
  readonly scaleNote: ScaleNote;
  readonly octave: number;
  readonly clef: ScoreStaffViewModel['lines'][number]['clef'];
  readonly slotIndex: number;
  readonly highlighted: boolean;
  readonly finger: PianoFinger | null;
}): ScoreStaffViewModel['lines'][number]['notes'][number] {
  return {
    id: `${input.mode}-${input.clef}-${input.slotIndex}-${input.scaleNote.physicalPitchClass}-${input.octave}`,
    noteName: input.scaleNote.name,
    degree: input.scaleNote.degree,
    degreeLabel: formatScaleDegreeLabel(input.key.mode, input.scaleNote.degree),
    physicalPitchClass: input.scaleNote.physicalPitchClass,
    octave: input.octave,
    clef: input.clef,
    slotIndex: input.slotIndex,
    highlighted: input.highlighted,
    finger: input.finger
  };
}

function getPracticeFinger(fingering: ScaleFingering | null, slotIndex: number): PianoFinger | null {
  if (fingering === null) {
    return null;
  }

  const lastStepIndex = fingering.steps.length - 1;
  const stepIndex =
    slotIndex === PRACTICE_SLOT_COUNT - 1 ? lastStepIndex : slotIndex % lastStepIndex;

  return fingering.steps[stepIndex].finger;
}

function getClefForPhysicalPitch(
  physicalPitchClass: PhysicalPitchClass,
  octave: number
): ScoreStaffViewModel['lines'][number]['clef'] {
  return getAbsolutePitch(physicalPitchClass, octave) < MIDDLE_C_PITCH ? 'bass' : 'treble';
}

function getNearestTonicOctave(physicalPitchClass: PhysicalPitchClass): number {
  const lowerOctave = Math.floor(
    (MIDDLE_C_PITCH - physicalPitchClass) / PHYSICAL_PITCH_CLASSES.length
  );
  const lowerDistance = Math.abs(
    getAbsolutePitch(physicalPitchClass, lowerOctave) - MIDDLE_C_PITCH
  );
  const higherDistance = Math.abs(
    getAbsolutePitch(physicalPitchClass, lowerOctave + 1) - MIDDLE_C_PITCH
  );

  return lowerDistance <= higherDistance ? lowerOctave : lowerOctave + 1;
}

function getAbsolutePitch(physicalPitchClass: PhysicalPitchClass, octave: number): number {
  return octave * PHYSICAL_PITCH_CLASSES.length + physicalPitchClass;
}

function createActiveChordHighlight(input: {
  readonly activeChord: DiatonicChord | null;
  readonly chordLayerEnabled: boolean;
}): ActiveChordHighlight {
  return {
    chord: input.activeChord,
    enabled: input.chordLayerEnabled,
    pitchClasses: new Set(input.activeChord?.notes.map((note) => note.physicalPitchClass) ?? [])
  };
}

function isActiveChordHighlighted(
  activeChordHighlight: ActiveChordHighlight,
  physicalPitchClass: PhysicalPitchClass
): boolean {
  return (
    activeChordHighlight.enabled &&
    activeChordHighlight.chord !== null &&
    activeChordHighlight.pitchClasses.has(physicalPitchClass)
  );
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
    return id === 'scaleFormula' || id === 'scaleNotes' || id === 'scaleFingering';
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

/** Ноты гаммы одинаковы для всех вариантов — выносим их одной строкой, дальше только пальцы. */
function buildScaleFingeringRows(
  fingerings: readonly ScaleFingering[]
): readonly TheoryOverlayRow[] {
  const ascending = fingerings.find((fingering) => fingering.direction === 'ascending');
  const notesRow =
    ascending === undefined
      ? []
      : [
          {
            label: 'Ноты',
            value: ascending.steps.map((step) => step.scaleNote.name).join(' - ')
          }
        ];

  return [
    ...notesRow,
    ...fingerings.map((fingering) => ({
      label: `${formatScaleFingeringHand(fingering.hand)} ${formatScaleFingeringDirection(
        fingering.direction
      )}`,
      value: fingering.patternLabel
    }))
  ];
}

function formatScaleFingeringHand(hand: ScaleFingeringHand): string {
  return hand === 'right' ? 'Правая' : 'Левая';
}

function formatScaleFingeringDirection(direction: ScaleFingeringDirection): string {
  return direction === 'ascending' ? 'вверх' : 'вниз';
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

function getFingeringLabelByKeyId(input: {
  readonly fingering: ScaleFingering | null;
  readonly startOctave: number;
  readonly octaveCount: number;
}): ReadonlyMap<string, string> {
  const labelByKeyId = new Map<string, string>();

  if (input.fingering === null) {
    return labelByKeyId;
  }

  const lowerTonicOctave = input.startOctave + (input.octaveCount > 2 ? 1 : 0);

  for (const step of input.fingering.steps) {
    const octave = lowerTonicOctave + step.octaveOffset;

    labelByKeyId.set(`${step.scaleNote.physicalPitchClass}-${octave}`, String(step.finger));
  }

  return labelByKeyId;
}
