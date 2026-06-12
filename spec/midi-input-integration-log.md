# Журнал реализации ТЗ MIDI-ввод через WebMIDI.js

ТЗ: [`midi-input-integration.md`](./midi-input-integration.md)

Цель журнала — восстановить состояние реализации после сжатия контекста. Журнал не заменяет ТЗ и не пересказывает diff.

## Правила ведения

- Перед продолжением работы прочитать ТЗ и этот журнал.
- Продолжать первый этап со статусом не `done`.
- Не переходить к следующему этапу, пока текущий этап не прошел свой `stage gate`.
- Обновлять журнал после закрытия этапа, blocker или значимого промежуточного результата.
- Записи держать короткими: scope, измененные модули, проверки, coverage, риски, следующее действие.
- Не фиксировать каждую мелкую правку и не вставлять полный diff.

## Статусы

- `not started`
- `in progress`
- `done`
- `blocked`

## Текущий указатель

- Активное ТЗ: `spec/midi-input-integration.md`
- Активный этап: завершено
- Статус: `done`
- Следующее действие: нет.

## Сводка по этапам

| Этап | Название | Статус | Последнее обновление |
| ---- | -------- | ------ | -------------------- |
| 1 | Зависимость, типы и session state | `done` | 2026-06-13 |
| 2 | Чистый MIDI note mapping | `done` | 2026-06-13 |
| 3 | WebMIDI.js adapter и controller lifecycle | `done` | 2026-06-13 |
| 4 | View-model подсветка клавиатуры и нотного стана | `done` | 2026-06-13 |
| 5 | Визуальный рендер `midiPressed` | `done` | 2026-06-13 |
| 6 | MIDI UI desktop и compact layout | `done` | 2026-06-13 |
| 7 | Documentation, browser verification и hardware smoke | `done` | 2026-06-13 |
| 8 | Рефакторинг, чистка и полировка | `done` | 2026-06-13 |

## Ход реализации

### Этап 1 — Зависимость, типы и session state

Статус: `done`

Записи:

- 2026-06-13 — dispatch. Executor: `019ebdc2-1a1e-73c3-b0e5-505cedbde930`; corrective: `0/3`; baseline: `git status --short` clean, `git diff` empty, `git diff --staged` empty; active scope: `package.json`, `package-lock.json`, `src/midi/types.ts`, `src/music/types.ts`, `src/state/app-state.ts`, focused state tests; out-of-scope: UI, WebMIDI lifecycle/controller, 3D/staff rendering, README. Следующее действие: реализация этапа 1 и отчет `ready_for_review` или `blocked`.
- 2026-06-13 — done. Review gate: pass; stage-owned delta: installed `webmidi`, added plain MIDI adapter types, domain MIDI note/highlight types, session-only Zustand MIDI state/actions, focused MIDI state tests. Checks: `npm run test` pass (8 files, 90 tests), `npm run typecheck` pass, `git diff --check` pass; source audit `rg "WebMidi|from 'webmidi'|from \"webmidi\"|requestMIDIAccess|enable\\(" src package.json` found no runtime lifecycle/import in `src`. Coverage: not run, not required for this stage. Risks: `StaffNoteViewModel.highlighted` remains legacy until later view-model/render cleanup stage; MIDI note octave mapping intentionally deferred to stage 2. Следующее действие: этап 2.

### Этап 2 — Чистый MIDI note mapping

Статус: `done`

Записи:

- 2026-06-13 — dispatch. Executor: `019ebdc6-cb4e-78a3-81ae-a65c8f72b539`; corrective: `0/3`; baseline: current tree after stage 1 (`package.json`, `package-lock.json`, `src/midi/types.ts`, `src/music/types.ts`, `src/state/app-state.ts`, `src/state/__tests__/midi-state.test.ts`, log changes), `git diff --staged` empty; active scope: `src/music/midi-notes.ts` or neighboring domain module, `src/music/__tests__/midi-notes.test.ts`, minimal reuse updates in `src/state/app-state.ts` and MIDI state tests if needed; out-of-scope: WebMIDI adapter/controller, selectors/view-model highlight behavior, UI/rendering, README. Следующее действие: реализация чистого MIDI mapping и отчет `ready_for_review` или `blocked`.
- 2026-06-13 — done. Review gate: pass; stage-owned delta: added `src/music/midi-notes.ts`, `createMidiPressedNote`, deterministic MIDI note identity mapping, shared MIDI note/velocity validation, and music/state tests for normalized identity. Checks: `npm run test` pass (9 files, 102 tests), `npm run typecheck` pass, `git diff --check` pass; source audit found no browser/WebMIDI usage in `src/music`. Coverage: not run, not required for this stage. Risks: none; view-model/render integration remains future scope. Следующее действие: этап 3.

### Этап 3 — WebMIDI.js adapter и controller lifecycle

Статус: `done`

Записи:

- 2026-06-13 — dispatch. Executor: `019ebdca-cfbd-7a31-b84e-1bd5fc8e5892`; corrective: `0/3`; baseline: current tree after stages 1-2 (`webmidi` dependency, MIDI types/state, domain mapping/tests, log), `git diff --staged` empty; active scope: `src/midi/web-midi-client.ts`, `src/midi/useMidiController.ts`, MIDI adapter/controller tests, minimal state test updates if needed; out-of-scope: production UI, selector/view-model highlights, 3D/staff rendering, README, persistence, SysEx/output/all-inputs. Следующее действие: реализация adapter/controller lifecycle и отчет `ready_for_review` или `blocked`.
- 2026-06-13 — done. Review gate: pass; stage-owned delta: added WebMIDI adapter client, controller hook, lifecycle bridge, fake-client controller tests for access/status mapping, auto-connect, select/disconnect, notes and cleanup. Checks: `npm run test` pass (10 files, 114 tests), `npm run typecheck` pass, `npm run lint` pass, `git diff --check` pass; source audit `rg "from 'webmidi'|from \"webmidi\"" src` found only `src/midi/web-midi-client.ts`; precise `src/music -> src/midi` import audit found no forbidden imports. Coverage: not run, not required for this stage. Risks: browser permission/device smoke deferred to stage 7; device refresh without selected input is via repeated user request because current client callbacks attach during `listenToInput`. Следующее действие: этап 4.

### Этап 4 — View-model подсветка клавиатуры и нотного стана

Статус: `done`

Записи:

- 2026-06-13 — dispatch. Executor: `019ebdd3-afc7-79d3-9d31-6a91de6c5610`; corrective: `0/3`; baseline: current tree after stages 1-3 (`webmidi` dependency, MIDI types/state, mapping, adapter/controller, tests, log), `git diff --staged` empty; active scope: `src/music/types.ts`, `src/music/view-models.ts`, `src/state/selectors.ts`, focused selector/view-model tests; out-of-scope: visual rendering CSS/3D/ScoreStaff implementation, production MIDI UI, README, WebMIDI lifecycle changes. Следующее действие: реализация renderer-agnostic `midiPressed` models и отчет `ready_for_review` или `blocked`.
- 2026-06-13 — done. Review gate: pass; stage-owned delta: wired active MIDI notes into keyboard and staff view models, added exact pitch identity matching, added `StaffNoteViewModel.highlightLayers`, kept legacy `highlighted` active-chord-only, added `midiPressed` legend item and selector tests. Checks: `npm run test` pass (10 files, 121 tests), `npm run typecheck` pass, `git diff --check` pass; source audits: `webmidi` import remains only adapter, no `src/music -> src/midi` imports. Coverage: not run, not required for this stage. Risks: visual rendering intentionally still ignores `midiPressed` until stage 5. Следующее действие: этап 5.

### Этап 5 — Визуальный рендер `midiPressed`

Статус: `done`

Записи:

- 2026-06-13 — dispatch. Executor: `019ebdd9-e653-77f0-a09a-450996149d2c`; corrective: `0/3`; baseline: current tree after stages 1-4 (MIDI dependency/state/mapping/adapter/view-models/tests/log), `git diff --staged` empty; active scope: `src/scene/materials.ts`, `src/scene/PianoKey3D.tsx`, `src/scene/PianoKeyboard3D.tsx` if needed, `src/ui/hud/ScoreStaff.tsx`, `src/styles/layout.css`, `src/ui/hud/ColorLegend.tsx` if needed, focused component tests; out-of-scope: MIDI lifecycle/UI connection panel, selectors/view-model feature changes except renderer compatibility, README. Следующее действие: визуальный renderer/data contract для `midiPressed` и отчет `ready_for_review` или `blocked`.
- 2026-06-13 — done. Review gate: pass; stage-owned delta: added cyan `midiPressed` color, 3D key pressed/glow priority, ScoreStaff note/label priority with stable `data-midi-pressed`, `data-highlight-layers`, `data-highlight-priority`, legend swatch CSS, focused ScoreStaff/ColorLegend tests. Checks: `npm run test` pass (11 files, 124 tests), `npm run typecheck` pass, `npm run lint` pass, `git diff --check` pass; source audit `webmidi` import remains only adapter. Browser sanity on `http://127.0.0.1:5173/`: desktop MIDI legend swatch rendered `10x16` with cyan gradient and no body overflow; mobile `390x844` no body overflow; browser console errors/warnings none. Coverage: not run, not required for this stage. Risks: real active MIDI visual state awaits stage 6 UI/stage 7 hardware/browser verification. Следующее действие: этап 6.

### Этап 6 — MIDI UI desktop и compact layout

Статус: `done`

Записи:

- 2026-06-13 — dispatch. Executor: `019ebde3-587c-7f82-81bd-4e6c10a6bc7f`; corrective: `0/3`; baseline: current tree after stages 1-5 (MIDI dependency/state/mapping/adapter/view-models/render/tests/log), `git diff --staged` empty; active scope: `src/app/AppShell.tsx`, `src/ui/hud/TopHud.tsx`, new `src/ui/hud/MidiPanel.tsx` or equivalent, `src/styles/layout.css`, App/HUD component tests, minimal controller injection/mocking support; out-of-scope: new MIDI features, persistence, README, browser/hardware smoke beyond component tests, adapter lifecycle changes unless required for UI compatibility. Следующее действие: desktop/compact MIDI UI и отчет `ready_for_review` или `blocked`.
- 2026-06-13 — done. Review gate: pass; stage-owned delta: added desktop `MIDI` action, compact toolbar `MIDI` action, shared `MidiPanel`, status/input/disconnect UI, CSS, and mocked App tests. Checks: `npm run test` pass (11 files, 135 tests), `npm run typecheck` pass, `npm run lint` pass, `git diff --check` pass; source audits: `webmidi` import remains only adapter, no `src/music -> src/midi` imports. Browser sanity on `http://127.0.0.1:5173/`: desktop one MIDI button and no dialog before click, panel opens with `MIDI не подключен`, no body overflow; compact `390x844` toolbar contains `Тональность`, `Аккорды`, `MIDI`, `Теория`, `Фокус`, MIDI sheet opens with idle state, no body overflow; browser console errors/warnings none. Coverage: not run, not required for this stage. Risks: real permission/device smoke deferred to stage 7. Следующее действие: этап 7.

### Этап 7 — Documentation, browser verification и hardware smoke

Статус: `done`

Записи:

- 2026-06-13 — dispatch. Executor: `019ebdea-d60c-7333-ac36-b28647cdd89d`; corrective: `0/3`; baseline: current tree after stages 1-6 (MIDI dependency/state/mapping/adapter/view-models/render/UI/tests/log), `git diff --staged` empty; active scope: `README.md`, focused docs audit, automated checks; browser verification/hardware smoke results to be reviewed and recorded by orchestrator. Out-of-scope: new behavior changes, feature expansion, browser support claims beyond Web MIDI API/WebMIDI.js, screenshots. Следующее действие: README/manual QA documentation and report `ready_for_review` or `blocked`.
- 2026-06-13 — done. Review gate: pass; stage-owned delta: README now documents MIDI as visual-only input, Web MIDI secure-context/browser limits, OS-level Bluetooth pairing, and manual QA steps. Checks: `npm run test` pass (11 files, 135 tests), `npm run typecheck` pass, `npm run lint` pass, `git diff --check` pass. Browser sanity on `http://127.0.0.1:5173/`: desktop one `MIDI` button, no dialog before click, panel opens, no horizontal overflow, console errors/warnings none; compact `390x844` toolbar contains `Тональность`, `Аккорды`, `MIDI`, `Теория`, `Фокус`, MIDI sheet opens without overflow; `Вид` → `Практика` renders score staff SVG with 30 labels and no horizontal overflow. Hardware smoke: no physical or virtual MIDI input was available in this environment, so device permission/selection/note press remains documented for manual QA. Coverage: not run, not required for this stage. Risks: real-device smoke should be run before release on a browser with Web MIDI support. Следующее действие: этап 8.

### Этап 8 — Рефакторинг, чистка и полировка

Статус: `done`

Записи:

- 2026-06-13 — dispatch. Executor: `019ebdf1-6aa8-7df2-a5bc-23d9b8a8895c`; corrective: `0/3`; baseline: current tree after stages 1-7 (`README.md`, `package.json`, `package-lock.json`, `src/midi/**`, MIDI state/mapping/adapter/controller/view-model/render/UI/tests, log), `git diff --staged` empty; active scope: MIDI cleanup in touched production/test files, especially `src/music/types.ts`, `src/music/view-models.ts`, `src/ui/hud/ScoreStaff.tsx`, related tests, source-audit/readme polish if needed. Out-of-scope: new MIDI features, broad formatting/codemods, changing public behavior beyond cleanup, generated `dist`/`coverage`. Следующее действие: remove stale/transitional MIDI code and report `ready_for_review` or `blocked`.
- 2026-06-13 — done. Review gate: pass; stage-owned delta: removed ambiguous staff `highlighted` boolean and `data-highlighted` contract, kept explicit `highlightLayers`/priority attributes, updated active-chord staff selectors/styles/tests, and verified listener cleanup paths. Checks: `rg "TODO|FIXME|console\\." src` no hits; `rg "from 'webmidi'|from \"webmidi\"" src` only `src/midi/web-midi-client.ts`; precise forbidden `src/music -> src/midi` import audit no hits; `npm run test` pass (11 files, 135 tests), `npm run typecheck` pass, `npm run lint` pass, `git diff --check` pass. Coverage: not run, not required for this cleanup stage. Risks: broad regex `rg "src/midi|\\.\\./midi|\\.\\./\\.\\./midi" src/music` remains expected to false-positive on allowed local `../midi-notes`; use precise import audit above. Следующее действие: финальная проверка.

## Финальная проверка

- Статус: `done`
- 2026-06-13 — done. Final Readiness Gate: pass. Сквозные проверки на интегрированном результате: `npm run test` pass (11 files, 135 tests), `npm run typecheck` pass, `npm run lint` pass, `npm run build` pass, `git diff --check` pass. Source audits: `rg "TODO|FIXME|console\\." src` no hits; `rg "from 'webmidi'|from \"webmidi\"" src` only `src/midi/web-midi-client.ts`; precise forbidden `src/music -> src/midi` import audit no hits; staff cleanup audit found no MIDI/staff `data-highlighted` or `StaffNoteViewModel.highlighted` remnants. Journal audit: stages 1-8 are `done`, each has unique executor id, baseline and stage-owned delta. Browser sanity on `http://127.0.0.1:5173/`: desktop/mobile MIDI panel opens with idle status and no horizontal overflow; practice staff renders SVG with 30 labels, `data-highlight-layers`/`data-highlight-priority`, and no legacy `data-highlighted`; console errors/warnings none. Coverage: not run; not required by final gate. Residual risks: real physical/virtual MIDI device smoke was unavailable in this environment and remains a documented manual QA step; Vite build reports the existing large-chunk warning.
