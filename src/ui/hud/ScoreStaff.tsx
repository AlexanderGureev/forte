import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Formatter, Renderer, Stave, StaveConnector, StaveNote, Voice } from 'vexflow';
import type {
  ScoreStaffViewModel,
  StaffClef,
  StaffHighlightLayer,
  StaffLineViewModel,
  StaffNoteViewModel,
  TheoryOverlayContextTarget
} from '../../music/types';

export interface ScoreStaffProps {
  readonly model: ScoreStaffViewModel;
  readonly onOpenTheory: (target: TheoryOverlayContextTarget) => void;
  readonly className?: string;
}

/* Партитура рисуется 1:1 в CSS-пикселях под фактическую ширину панели:
   линии стана остаются четкими, а подписи под нотами совпадают с нотами,
   потому что берут координаты прямо из VexFlow. На узких экранах
   включается горизонтальный скролл вместо нечитаемого уменьшения. */
const MIN_SCORE_WIDTH = 640;
const STAVE_X = 12;
const STAVE_RIGHT_PADDING = 12;
const NOTE_TAIL_PADDING = 30;
const TREBLE_STAVE_Y = 6;
const BASS_STAVE_MIN_Y = 116;
const NOTE_HEAD_CENTER_OFFSET = 6;

/* Геометрия нотоносца VexFlow: полтона-шаг 5px, верхняя линия на 40px ниже
   y стана, пять линий занимают 40px, штиль — 35px. */
const STAFF_STEP = 5;
const TOP_LINE_OFFSET = 40;
const STAVE_LINES_HEIGHT = 40;
const STEM_HEIGHT = 35;
const NOTE_HEAD_HALF_HEIGHT = 5;
const LABEL_CLEARANCE = 6;
const LABEL_BLOCK_HEIGHT = 30;
const STAFF_BOTTOM_LABEL_GAP = 14;

const LETTER_STEP: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };
const TREBLE_TOP_LINE_INDEX = 38; // F5
const BASS_TOP_LINE_INDEX = 26; // A3
const BASS_MIDDLE_LINE_INDEX = 22; // D3

const SCORE_INK_STYLE = {
  fillStyle: '#f4eee2',
  strokeStyle: '#f4eee2'
};
const ACTIVE_CHORD_STYLE = {
  fillStyle: '#fdc878',
  strokeStyle: '#fdc878'
};
const MIDI_PRESSED_STYLE = {
  fillStyle: '#6ee8ff',
  strokeStyle: '#6ee8ff'
};
const INVISIBLE_STYLE = {
  fillStyle: 'transparent',
  strokeStyle: 'transparent'
};

interface StaffLabel {
  readonly id: string;
  readonly clef: StaffClef;
  readonly slotIndex: number;
  readonly noteName: StaffNoteViewModel['noteName'];
  readonly degreeLabel: StaffNoteViewModel['degreeLabel'];
  readonly highlightLayers: readonly StaffHighlightLayer[];
  readonly finger: StaffNoteViewModel['finger'];
  readonly x: number;
}

interface StaffLayout {
  readonly bassStaveY: number;
  readonly trebleLabelY: number;
  readonly bassLabelY: number;
  readonly height: number;
}

export function ScoreStaff({ model, onOpenTheory, className }: ScoreStaffProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<HTMLDivElement>(null);
  const [scoreWidth, setScoreWidth] = useState<number | null>(null);
  const [labels, setLabels] = useState<readonly StaffLabel[]>([]);
  const layout = useMemo(() => computeStaffLayout(model), [model]);
  const keySpec = getVexFlowKeySpec(model);
  const ariaLabel = `Партитура гаммы ${model.key.displayName}, режим ${formatModeLabel(
    model.mode
  )}`;
  const rootClassName =
    className === undefined ? 'hud-score-staff' : `hud-score-staff ${className}`;

  useLayoutEffect(() => {
    const scroller = scrollRef.current;

    if (scroller === null) {
      return;
    }

    const measure = () => {
      setScoreWidth(Math.max(MIN_SCORE_WIDTH, Math.floor(scroller.clientWidth)));
    };

    measure();
    window.addEventListener('resize', measure);

    return () => {
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    const container = rendererRef.current;

    if (container === null || scoreWidth === null) {
      return;
    }

    container.replaceChildren();
    setLabels(renderVexFlowScore(container, model, keySpec, scoreWidth, layout));

    return () => {
      container.replaceChildren();
    };
  }, [keySpec, layout, model, scoreWidth]);

  return (
    <div className={rootClassName}>
      <div className="hud-score-staff__scroll" ref={scrollRef}>
        <div
          className="hud-score-staff__stage"
          role="img"
          aria-label={ariaLabel}
          data-mode={model.mode}
          data-key-signature-treble={keySpec}
          data-key-signature-bass={keySpec}
          data-slot-count={model.slotCount}
          style={{ width: scoreWidth ?? undefined, height: layout.height }}
        >
          <div className="hud-score-staff__renderer" ref={rendererRef} aria-hidden="true" />
          <div className="hud-score-staff__labels" aria-hidden="true">
            {labels.map((label) => {
              const midiPressed = label.highlightLayers.includes('midiPressed');
              const highlightPriority = getStaffHighlightPriority(label.highlightLayers);

              return (
                <span
                  key={label.id}
                  className="hud-score-staff__label"
                  data-clef={label.clef}
                  data-slot-index={label.slotIndex}
                  data-note-name={label.noteName}
                  data-degree-label={label.degreeLabel}
                  data-highlight-layers={formatHighlightLayers(label.highlightLayers)}
                  data-highlight-priority={highlightPriority}
                  data-midi-pressed={midiPressed ? 'true' : 'false'}
                  data-finger={label.finger === null ? 'none' : label.finger}
                  style={{
                    left: label.x,
                    top: label.clef === 'treble' ? layout.trebleLabelY : layout.bassLabelY
                  }}
                >
                  <span className="hud-score-staff__label-note">{label.noteName}</span>
                  <span className="hud-score-staff__label-meta">
                    <span className="hud-score-staff__label-degree">{label.degreeLabel}</span>
                    {label.finger === null ? null : (
                      <span className="hud-score-staff__label-finger">{label.finger}</span>
                    )}
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      </div>
      <button
        className="hud-info-button hud-score-staff__info"
        type="button"
        aria-label="Подробнее о гамме"
        onClick={() => onOpenTheory('scale')}
      >
        i
      </button>
    </div>
  );
}

/* Вертикальная раскладка считается из модели до рендера: строки подписей
   встают ниже самой нижней ноты своего стана, басовый стан отодвигается от
   подписей скрипичного, высота панели подстраивается под содержимое. */
function computeStaffLayout(model: ScoreStaffViewModel): StaffLayout {
  const trebleTopLineY = TREBLE_STAVE_Y + TOP_LINE_OFFSET;
  const trebleBottomLineY = trebleTopLineY + STAVE_LINES_HEIGHT;
  const trebleLowestY = getLowestNoteheadY(model.lines[0], trebleTopLineY, TREBLE_TOP_LINE_INDEX);
  const trebleLabelY = Math.max(
    trebleBottomLineY + STAFF_BOTTOM_LABEL_GAP,
    trebleLowestY + NOTE_HEAD_HALF_HEIGHT + LABEL_CLEARANCE
  );

  const bassTopLineY = Math.max(
    BASS_STAVE_MIN_Y + TOP_LINE_OFFSET,
    trebleLabelY + LABEL_BLOCK_HEIGHT + LABEL_CLEARANCE + getBassTopProtrusion(model.lines[1])
  );
  const bassBottomLineY = bassTopLineY + STAVE_LINES_HEIGHT;
  const bassLowestY = getLowestNoteheadY(model.lines[1], bassTopLineY, BASS_TOP_LINE_INDEX);
  const bassLabelY = Math.max(
    bassBottomLineY + STAFF_BOTTOM_LABEL_GAP,
    bassLowestY + NOTE_HEAD_HALF_HEIGHT + LABEL_CLEARANCE
  );

  return {
    bassStaveY: bassTopLineY - TOP_LINE_OFFSET,
    trebleLabelY,
    bassLabelY,
    height: bassLabelY + LABEL_BLOCK_HEIGHT
  };
}

function getDiatonicIndex(note: StaffNoteViewModel): number {
  return note.octave * 7 + LETTER_STEP[note.noteName.charAt(0)];
}

function getLowestNoteheadY(
  line: StaffLineViewModel,
  topLineY: number,
  topLineIndex: number
): number {
  return line.notes.reduce(
    (lowest, note) => Math.max(lowest, topLineY + (topLineIndex - getDiatonicIndex(note)) * STAFF_STEP),
    Number.NEGATIVE_INFINITY
  );
}

/* Насколько ноты басового стана выступают над его верхней линией:
   головки нот над станом и штили вверх у нот ниже средней линии. */
function getBassTopProtrusion(line: StaffLineViewModel): number {
  const minTopOffset = line.notes.reduce((minOffset, note) => {
    const index = getDiatonicIndex(note);
    const noteheadOffset = (BASS_TOP_LINE_INDEX - index) * STAFF_STEP;
    const topReach = index < BASS_MIDDLE_LINE_INDEX ? STEM_HEIGHT : NOTE_HEAD_HALF_HEIGHT;

    return Math.min(minOffset, noteheadOffset - topReach);
  }, 0);

  return Math.max(0, -minTopOffset);
}

function renderVexFlowScore(
  container: HTMLDivElement,
  model: ScoreStaffViewModel,
  keySpec: string,
  scoreWidth: number,
  layout: StaffLayout
): readonly StaffLabel[] {
  const renderer = new Renderer(container, Renderer.Backends.SVG);

  renderer.resize(scoreWidth, layout.height);

  const context = renderer.getContext();
  context.setFillStyle(SCORE_INK_STYLE.fillStyle);
  context.setStrokeStyle(SCORE_INK_STYLE.strokeStyle);

  const staveWidth = scoreWidth - STAVE_X - STAVE_RIGHT_PADDING;
  const trebleStave = new Stave(STAVE_X, TREBLE_STAVE_Y, staveWidth)
    .addClef('treble')
    .addKeySignature(keySpec);
  const bassStave = new Stave(STAVE_X, layout.bassStaveY, staveWidth)
    .addClef('bass')
    .addKeySignature(keySpec);

  trebleStave.setStyle(SCORE_INK_STYLE).setContext(context).draw();
  bassStave.setStyle(SCORE_INK_STYLE).setContext(context).draw();

  new StaveConnector(trebleStave, bassStave)
    .setType('brace')
    .setContext(context)
    .draw();
  new StaveConnector(trebleStave, bassStave)
    .setType('singleLeft')
    .setContext(context)
    .draw();

  if (model.slotCount === 0) {
    fixUpSvg(container);

    return [];
  }

  const trebleEntries = createVexFlowNotes(model.lines[0], model.slotCount);
  const bassEntries = createVexFlowNotes(model.lines[1], model.slotCount);
  const trebleVoice = createVoice(model.slotCount, trebleEntries.map((entry) => entry.staveNote));
  const bassVoice = createVoice(model.slotCount, bassEntries.map((entry) => entry.staveNote));
  const noteStartX = Math.max(trebleStave.getNoteStartX(), bassStave.getNoteStartX());
  const justifyWidth = staveWidth - (noteStartX - STAVE_X) - NOTE_TAIL_PADDING;

  new Formatter()
    .joinVoices([trebleVoice])
    .joinVoices([bassVoice])
    .format([trebleVoice, bassVoice], justifyWidth, { context });

  trebleVoice.draw(context, trebleStave);
  bassVoice.draw(context, bassStave);

  fixUpSvg(container);

  return [...trebleEntries, ...bassEntries].flatMap((entry) => {
    if (entry.modelNote === null) {
      return [];
    }

    return [
      {
        id: `label-${entry.modelNote.id}`,
        clef: entry.modelNote.clef,
        slotIndex: entry.modelNote.slotIndex,
        noteName: entry.modelNote.noteName,
        degreeLabel: entry.modelNote.degreeLabel,
        highlightLayers: entry.modelNote.highlightLayers,
        finger: entry.modelNote.finger,
        x: entry.staveNote.getAbsoluteX() + NOTE_HEAD_CENTER_OFFSET
      }
    ];
  });
}

function fixUpSvg(container: HTMLDivElement): void {
  const svg = container.querySelector('svg');

  if (svg !== null) {
    svg.classList.add('hud-score-staff__svg');
  }
}

function createVoice(slotCount: number, notes: StaveNote[]): Voice {
  return new Voice({ numBeats: slotCount, beatValue: 4 })
    .setMode(Voice.Mode.SOFT)
    .addTickables(notes);
}

interface StaffNoteEntry {
  readonly staveNote: StaveNote;
  readonly modelNote: StaffNoteViewModel | null;
}

function createVexFlowNotes(
  line: StaffLineViewModel,
  slotCount: number
): readonly StaffNoteEntry[] {
  const noteBySlot = new Map(line.notes.map((note) => [note.slotIndex, note]));

  return Array.from({ length: slotCount }, (_, slotIndex) => {
    const note = noteBySlot.get(slotIndex);

    if (note === undefined) {
      return { staveNote: createInvisibleRest(line.clef), modelNote: null };
    }

    return { staveNote: createVexFlowNote(note), modelNote: note };
  });
}

function createVexFlowNote(note: StaffNoteViewModel): StaveNote {
  const staveNote = new StaveNote({
    keys: [toVexFlowNoteKey(note)],
    duration: 'q',
    clef: note.clef,
    autoStem: true
  });
  const style = getStaffNoteStyle(note.highlightLayers);

  staveNote.setStyle(style).setKeyStyle(0, style).setStemStyle(style);

  return staveNote;
}

function getStaffNoteStyle(highlightLayers: readonly StaffHighlightLayer[]) {
  if (highlightLayers.includes('midiPressed')) {
    return MIDI_PRESSED_STYLE;
  }

  if (highlightLayers.includes('activeChord')) {
    return ACTIVE_CHORD_STYLE;
  }

  return SCORE_INK_STYLE;
}

function getStaffHighlightPriority(
  highlightLayers: readonly StaffHighlightLayer[]
): StaffHighlightLayer | 'none' {
  if (highlightLayers.includes('midiPressed')) {
    return 'midiPressed';
  }

  if (highlightLayers.includes('activeChord')) {
    return 'activeChord';
  }

  return 'none';
}

function formatHighlightLayers(highlightLayers: readonly StaffHighlightLayer[]): string {
  return highlightLayers.length === 0 ? 'none' : highlightLayers.join(' ');
}

function createInvisibleRest(clef: StaffClef): StaveNote {
  const rest = new StaveNote({
    keys: [clef === 'treble' ? 'b/4' : 'd/3'],
    duration: 'qr',
    clef
  });

  rest.setStyle(INVISIBLE_STYLE).setKeyStyle(0, INVISIBLE_STYLE).setStemStyle(INVISIBLE_STYLE);
  rest.setLedgerLineStyle(INVISIBLE_STYLE);

  return rest;
}

function toVexFlowNoteKey(note: StaffNoteViewModel): string {
  return `${note.noteName.toLowerCase()}/${note.octave}`;
}

function getVexFlowKeySpec(model: ScoreStaffViewModel): string {
  return model.key.mode === 'naturalMinor' ? `${model.key.tonic}m` : model.key.tonic;
}

function formatModeLabel(mode: ScoreStaffViewModel['mode']): string {
  return mode === 'staffImprovisation' ? 'Импровизация' : 'Практика';
}
