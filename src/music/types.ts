export type Mode = 'major' | 'naturalMinor';

export type NoteLetter = 'C' | 'D' | 'E' | 'F' | 'G' | 'A' | 'B';

export type Accidental = 'natural' | 'sharp' | 'flat';

export type NoteName =
  | 'C'
  | 'C#'
  | 'Db'
  | 'D'
  | 'D#'
  | 'Eb'
  | 'E'
  | 'E#'
  | 'Fb'
  | 'F'
  | 'F#'
  | 'Gb'
  | 'G'
  | 'G#'
  | 'Ab'
  | 'A'
  | 'A#'
  | 'Bb'
  | 'B'
  | 'B#'
  | 'Cb';

export type PhysicalPitchClass = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type ScaleDegree = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export type ChordQuality = 'major' | 'minor' | 'diminished';

export type Difficulty = 'easy' | 'medium' | 'advanced';

export type LabelMode = 'notes' | 'degrees';

export type KeyboardViewport = 'desktop' | 'tablet' | 'mobile';

export type ScaleDisplayMode = 'strip' | 'staffImprovisation' | 'staffPractice';

export type StaffClef = 'treble' | 'bass';

export type DegreeLabel = '1' | '2' | '3' | '4' | '5' | '6' | '7' | 'b3' | 'b6' | 'b7';

export type PianoFinger = 1 | 2 | 3 | 4 | 5;

export type ScaleFingeringHand = 'right' | 'left';

export type ScaleFingeringDirection = 'ascending' | 'descending';

export type ScaleFingeringPattern = readonly [
  PianoFinger,
  PianoFinger,
  PianoFinger,
  PianoFinger,
  PianoFinger,
  PianoFinger,
  PianoFinger,
  PianoFinger
];

export type ScaleFingeringOctaveOffset = 0 | 1;

export type KeyboardHighlightLayer = 'inScale' | 'tonic' | 'activeChord' | 'diminished';

export type TheoryOverlayContextTarget =
  | 'key'
  | 'scale'
  | 'chords'
  | 'progression'
  | 'activeChord'
  | 'keyboard'
  | 'colorLegend';

export type TheoryOverlaySectionId =
  | 'key'
  | 'scaleFormula'
  | 'scaleNotes'
  | 'scaleFingering'
  | 'keySignature'
  | 'diatonicChords'
  | 'activeChord'
  | 'progression'
  | 'relativeKey'
  | 'colorLegend';

export type ActiveChordSource = 'progression' | 'manual';

export type KeySignatureAccidental = 'natural' | 'sharp' | 'flat';

export type ScaleFormulaStep = 'W' | 'H';

export type ChordFormulaLabel = '1' | '3' | '5' | 'b3' | 'b5';

export type ProgressionId =
  | 'loop-1'
  | 'classic'
  | 'cadence'
  | 'minor-loop'
  | 'minor-basic'
  | 'descent';

export type RelativeKeyRelationship = 'relativeMajor' | 'relativeMinor';

export interface NoteSpelling {
  readonly name: NoteName;
  readonly letter: NoteLetter;
  readonly accidental: Accidental;
  readonly physicalPitchClass: PhysicalPitchClass;
}

export interface KeySignature {
  readonly accidental: KeySignatureAccidental;
  readonly count: number;
  readonly notes: readonly NoteLetter[];
}

export type KeyId = `${NoteName} Major` | `${NoteName} Minor`;

export interface KeyDefinition {
  readonly id: KeyId;
  readonly tonic: NoteName;
  readonly mode: Mode;
  readonly physicalPitchClass: PhysicalPitchClass;
  readonly keySignature: KeySignature;
  readonly signsCount: number;
  readonly difficulty: Difficulty;
  readonly recommended: boolean;
  readonly displayName: KeyId;
}

export type KeySelection =
  | KeyId
  | {
      readonly id: KeyId;
    }
  | {
      readonly tonic: NoteName;
      readonly mode: Mode;
    };

export interface ScaleNote extends NoteSpelling {
  readonly degree: ScaleDegree;
}

export interface Scale {
  readonly key: KeyDefinition;
  readonly formula: readonly ScaleFormulaStep[];
  readonly notes: readonly ScaleNote[];
}

export interface StaffNoteViewModel {
  readonly id: string;
  readonly noteName: NoteName;
  readonly degree: ScaleDegree;
  readonly degreeLabel: DegreeLabel;
  readonly physicalPitchClass: PhysicalPitchClass;
  readonly octave: number;
  readonly clef: StaffClef;
  readonly slotIndex: number;
  readonly highlighted: boolean;
  readonly finger: PianoFinger | null;
}

export interface StaffLineViewModel {
  readonly clef: StaffClef;
  readonly notes: readonly StaffNoteViewModel[];
}

export interface ScoreStaffViewModel {
  readonly mode: Exclude<ScaleDisplayMode, 'strip'>;
  readonly key: KeyDefinition;
  readonly keySignature: KeySignature;
  readonly slotCount: number;
  readonly lines: readonly [StaffLineViewModel, StaffLineViewModel];
}

export interface ScaleFingeringStep {
  readonly stepIndex: number;
  readonly scaleNote: ScaleNote;
  readonly finger: PianoFinger;
  readonly octaveOffset: ScaleFingeringOctaveOffset;
}

export interface ScaleFingering {
  readonly key: KeyDefinition;
  readonly hand: ScaleFingeringHand;
  readonly direction: ScaleFingeringDirection;
  readonly steps: readonly ScaleFingeringStep[];
  readonly patternLabel: string;
}

export interface ChordFormula {
  readonly quality: ChordQuality;
  readonly labels: readonly ChordFormulaLabel[];
  readonly semitones: readonly number[];
}

export interface DiatonicChord {
  readonly degree: ScaleDegree;
  readonly romanDegree: string;
  readonly name: string;
  readonly quality: ChordQuality;
  readonly notes: readonly ScaleNote[];
  readonly formula: ChordFormula;
  readonly tense: boolean;
}

export interface ProgressionStep {
  readonly stepIndex: number;
  readonly degree: ScaleDegree;
  readonly romanDegree: string;
}

export interface ProgressionPreset {
  readonly id: ProgressionId;
  readonly mode: Mode;
  readonly name: string;
  readonly steps: readonly ProgressionStep[];
}

export interface MaterializedProgressionStep extends ProgressionStep {
  readonly chordName: string;
  readonly chord: DiatonicChord;
  readonly notes: readonly ScaleNote[];
}

export interface MaterializedProgression {
  readonly id: ProgressionId;
  readonly mode: Mode;
  readonly name: string;
  readonly key: KeyDefinition;
  readonly steps: readonly MaterializedProgressionStep[];
}

export interface RelativeKey {
  readonly relationship: RelativeKeyRelationship;
  readonly key: KeyDefinition;
}

export interface KeyboardViewModelInput {
  readonly key: KeyDefinition;
  readonly scale: Scale;
  readonly activeChord: DiatonicChord | null;
  readonly chordLayerEnabled: boolean;
  readonly scaleFingering: ScaleFingering | null;
  readonly labelMode: LabelMode;
  readonly labelsVisible: boolean;
  readonly viewport: KeyboardViewport;
  readonly startOctave?: number;
}

export interface KeyboardKeyViewModel {
  readonly id: string;
  readonly physicalPitchClass: PhysicalPitchClass;
  readonly octave: number;
  readonly isWhiteKey: boolean;
  readonly isBlackKey: boolean;
  readonly scaleNote: ScaleNote | null;
  readonly noteLabel: NoteName | null;
  readonly degreeLabel: DegreeLabel | null;
  readonly visibleLabel: string | null;
  readonly fingeringLabel: string | null;
  readonly highlightLayers: readonly KeyboardHighlightLayer[];
}

export interface KeyboardViewModel {
  readonly viewport: KeyboardViewport;
  readonly startOctave: number;
  readonly octaveCount: number;
  readonly keys: readonly KeyboardKeyViewModel[];
}

export interface ColorLegendItem {
  readonly id: KeyboardHighlightLayer | 'chordRoot' | 'fingering' | 'fingeringOnChord';
  readonly label: string;
  readonly description: string;
}

export interface TheoryOverlayInput {
  readonly isOpen: boolean;
  readonly contextTarget: TheoryOverlayContextTarget | null;
  readonly key: KeyDefinition;
  readonly scale: Scale;
  readonly chords: readonly DiatonicChord[];
  readonly activeChord: DiatonicChord | null;
  readonly activeChordSource: ActiveChordSource | null;
  readonly activeProgressionStepIndex: number | null;
  readonly progression: MaterializedProgression;
  readonly colorLegend: readonly ColorLegendItem[];
  readonly scaleFingerings: readonly ScaleFingering[];
}

export interface TheoryOverlayRow {
  readonly label: string;
  readonly value: string;
}

export interface TheoryOverlaySection {
  readonly id: TheoryOverlaySectionId;
  readonly title: string;
  readonly rows: readonly TheoryOverlayRow[];
  readonly items: readonly string[];
  readonly highlighted: boolean;
}

export interface TheoryOverlayModel {
  readonly isOpen: boolean;
  readonly contextTarget: TheoryOverlayContextTarget | null;
  readonly key: KeyDefinition;
  readonly relativeKey: RelativeKey;
  readonly sections: readonly TheoryOverlaySection[];
}
