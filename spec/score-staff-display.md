# Режим партитуры гаммы — ТЗ для реализации

## 1. Цель

Добавить опциональное отображение выбранной тональности/гаммы в виде большого нотного стана поверх текущего приложения Forte Piano Improvisation.

Пользователь должен выбирать одно из трех представлений гаммы:

- `Плашка` — текущее поведение `ScaleStrip`.
- `Импровизация` — большой стан показывает все ноты выбранной гаммы, попавшие в текущий видимый диапазон 3D-клавиатуры.
- `Практика` — большой стан показывает двухоктавную гамму от тоники около middle C: верхний стан восходяще, нижний стан нисходяще.

Партитура должна использовать VexFlow как renderer, но правила музыкальной теории, выбор нот, октав, ступеней, аппликатуры и подсветки должны оставаться в `src/music` и derived state/selectors. UI и renderer получают готовую view model и не пересчитывают гаммы, аккорды, ключевые знаки или подписи ступеней.

## 2. Как выполнять это ТЗ

### Область работ

- Зависимость `vexflow` в `package.json` и `package-lock.json`.
- Состояние режима отображения гаммы в `src/state/app-state.ts`.
- Типы, view-model builders и selectors для большого стана в `src/music` и `src/state/selectors.ts`.
- Новый UI для большого стана в `src/ui/hud` или рядом с существующим HUD-слоем.
- Интеграция переключателя режима в меню `Вид` на desktop и в compact sheet.
- CSS в `src/styles/layout.css` и, при необходимости, `src/styles/theme.css`.
- Unit/component tests в существующих `__tests__`.

### Вне области работ

- Замена 3D-клавиатуры центральной партитурой.
- Режим чтения с листа, метр, размер, длительности, такты как музыкальная структура.
- Хроматические ноты вне выбранной гаммы.
- Независимый хоткей для переключения режима партитуры.
- Отдельная настройка подсветки аккорда на партитуре.
- Слоговые подписи `до ре ми`; подписи остаются буквенными `C D E`.
- Ручной drag/zoom/scroll партитуры.
- Редактирование сгенерированных `dist` и `coverage`.

### Предусловия и зависимости

- Использовать npm; lock-файл проекта — `package-lock.json`.
- Добавить runtime dependency `vexflow`. На момент подготовки ТЗ проверенная версия npm: `5.0.0`, лицензия MIT.
- Установка зависимости должна выполняться через `npm install vexflow`, чтобы обновился `package-lock.json`.
- Если VexFlow API отличается от ожидаемого, адаптер должен быть локализован в renderer-слое; доменная модель партитуры не должна зависеть от классов VexFlow.

### Общие инварианты

- `ScaleStrip` должен остаться текущим представлением по умолчанию.
- Переключение тональности, лада, прогрессии, активного аккорда, viewport и настройки `Только гамма` должно немедленно пересчитывать модель партитуры через selectors.
- Ключевые знаки должны рисоваться как настоящая key signature после скрипичного и басового ключей на обоих станах.
- Ноты гаммы не должны получать локальные `#`/`b`, если знак уже задан ключевой подписью. Подписи под нотами должны сохранять полное теоретическое имя, например `F#` или `Bb`.
- Большой стан не должен показывать размер `4/4` или смысловые такты. Допустима финальная/разделительная черта как визуальная рамка.
- Под каждой нотой должны быть локальные подписи: имя ноты и ступень. В `Практика` при включенной аппликатуре добавляются номера пальцев.
- На mobile/tablet/desktop партитура сжимается в доступную ширину без горизонтального скролла.
- Тесты не должны утверждать внутренности VexFlow, если observable behavior можно проверить через view model, DOM labels, `aria-label` и stable `data-*`.

### Матрица проверок

- Изменение domain/view-model behavior: focused Vitest tests для `src/music`/`src/state`, затем `npm run test`.
- Изменение React UI: React Testing Library tests, затем `npm run test`.
- Изменение TypeScript public types/state actions: `npm run typecheck`.
- Изменение CSS/layout: ручная browser-проверка desktop и mobile viewport, плюс `npm run lint`.
- Финальный gate: `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`.

## 3. Целевой public API

### Типы

Добавить доменные типы в `src/music/types.ts` или соседний модуль с реэкспортом из владельца:

```ts
export type ScaleDisplayMode = 'strip' | 'staffImprovisation' | 'staffPractice';

export type StaffClef = 'treble' | 'bass';

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
```

Допустимо уточнить имена интерфейсов при реализации, если сохраняются все контракты данных, tests и ownership. Не допускается хранить VexFlow objects в этих типах.

### State API

`AppState` должен получить:

```ts
readonly scaleDisplayMode: ScaleDisplayMode;
```

`AppActions` должен получить:

```ts
readonly setScaleDisplayMode: (mode: ScaleDisplayMode) => void;
```

Начальное значение: `'strip'`.

`setScaleDisplayMode` должен валидировать режим и бросать понятную ошибку для неподдерживаемого значения. Ошибка должна быть аналогична существующим validation errors в `app-state.ts`.

### Selectors

Добавить selector:

```ts
export function selectScoreStaffViewModel(
  state: AppState,
  viewport: KeyboardViewport
): ScoreStaffViewModel | null;
```

Selector возвращает `null`, если `state.scaleDisplayMode === 'strip'`. Для staff modes selector возвращает полную renderer-agnostic модель, достаточную для VexFlow renderer.

## 4. Целевая архитектура

- `src/music/view-models.ts` владеет построением нот большого стана: октавы, `slotIndex`, clef assignment, подписи ступеней, finger labels, active chord highlight flags.
- `src/state/selectors.ts` выбирает входные данные из `AppState`: текущую тональность, гамму, активный аккорд, `chordLayerEnabled`, `scaleFingeringEnabled`, viewport и `KeyboardViewModel`.
- `src/ui/hud/ScoreStaff.tsx` или эквивалентный HUD-компонент владеет VexFlow rendering и React accessibility wrapper.
- `src/ui/hud/ScaleStrip.tsx` остается владельцем текущей плашки.
- `src/ui/hud/TopHud.tsx` получает и рендерит control режима отображения в меню `Вид`; compact sheet получает тот же control.
- VexFlow adapter переводит renderer-agnostic model в VexFlow primitives: clefs, key signatures, stave notes, formatter, beams/voices если нужны. Он не вызывает `buildScale`, `buildDiatonicTriads`, `materializeProgression` и не нормализует key spelling.

## 5. Этапы реализации

### Этап 1 — Зависимость, типы и состояние режима

#### Цель

Добавить VexFlow как runtime dependency и ввести безопасное состояние выбора представления гаммы без изменения текущего UI по умолчанию.

#### Зависит от

Нет.

#### Контракт этапа

- Выполнить `npm install vexflow`; обновить `package.json` и `package-lock.json`.
- Добавить `ScaleDisplayMode` и связанные staff-типы без зависимости от VexFlow.
- Добавить `scaleDisplayMode: 'strip'` в `createInitialAppState`.
- Добавить `setScaleDisplayMode(mode)` с validation.
- Не менять текущее default rendering: после этапа приложение по-прежнему показывает `ScaleStrip`.
- Обновить state tests: initial state содержит `scaleDisplayMode: 'strip'`; action переключает все три режима; invalid mode бросает понятную ошибку.

#### Не делать в этом этапе

- Не создавать VexFlow renderer.
- Не добавлять staff selector.
- Не менять layout или меню `Вид`.
- Не менять музыкальные расчеты гамм, аккордов и прогрессий.

#### Тесты этапа

- `src/state/__tests__/state-selectors.test.ts`: default state и action behavior.
- Negative test для invalid `ScaleDisplayMode`.
- `npm run test -- src/state/__tests__/state-selectors.test.ts`, если Vitest поддерживает такой таргет в проекте; иначе `npm run test`.
- `npm run typecheck`.

#### Критерий завершения

- Dependency установлена через npm и lock-файл обновлен.
- TypeScript видит новые типы и state action.
- Все существующие тесты default rendering остаются зелеными.
- Нет VexFlow objects в domain/state types.

### Этап 2 — View model большого стана

#### Цель

Построить renderer-agnostic модель для режимов `Импровизация` и `Практика`.

#### Зависит от

Этап 1.

#### Контракт этапа

- Добавить builder в `src/music/view-models.ts` или соседний domain-модуль.
- Добавить `selectScoreStaffViewModel(state, viewport)` в `src/state/selectors.ts`.
- `strip`: selector возвращает `null`.
- `staffImprovisation`:
  - использует текущий `KeyboardViewModel` для выбранного viewport;
  - выбирает только клавиши, у которых `scaleNote !== null`;
  - сортирует ноты слева направо по `KeyboardViewModel.keys`;
  - не создает slots для внегаммовых клавиш;
  - назначает `slotIndex` без пропусков от `0` до `slotCount - 1`;
  - ноты ниже `C4` назначаются в `bass`, `C4` и выше — в `treble`;
  - `slotCount` равен количеству выбранных гаммовых нот в видимом диапазоне;
  - `highlighted` true только для нот активного аккорда и только при `chordLayerEnabled === true`.
- `staffPractice`:
  - не зависит от viewport для набора нот;
  - строит 15 slots: две октавы от тоники до тоники;
  - выбирает anchor octave как тонику, ближайшую к `C4`; при равной дистанции выбирает lower/equal octave;
  - верхний `treble` line идет восходяще от anchor до anchor + 2 октавы;
  - нижний `bass` line идет нисходяще от anchor до anchor - 2 октавы;
  - не подсвечивает активный аккорд;
  - при `scaleFingeringEnabled === true` верхний line получает аппликатуру правой руки ascending, нижний line — левой руки descending;
  - при выключенной аппликатуре `finger` должен быть `null`.
- Для обоих staff modes:
  - `noteName` использует существующее теоретическое spelling из `ScaleNote`;
  - `degreeLabel` использует `formatScaleDegreeLabel`;
  - `keySignature` берется из текущего `KeyDefinition`;
  - повторение октав сохраняет degree cycle без изменения имен ступеней.

#### Не делать в этом этапе

- Не импортировать VexFlow.
- Не рендерить SVG.
- Не добавлять UI control.
- Не менять `ScaleStrip`.

#### Тесты этапа

- Unit tests для `staffImprovisation` на C Major desktop: непрерывные slots, 21 гаммовая нота для 3 октав, bass ниже `C4`, treble от `C4`.
- Unit tests для другой тональности со знаками, например `E Major` или `F Major`: note names сохраняют `F#`/`Bb`, slots не содержат внегаммовых нот.
- Unit tests для `staffPractice`: 15 slots, верхняя линия ascending, нижняя descending, anchor около `C4`.
- Unit tests для active chord highlight в `staffImprovisation`: включается/выключается существующим `chordLayerEnabled`.
- Unit tests для аппликатуры в `staffPractice`: правая ascending наверху, левая descending внизу, только при включенной настройке.

#### Критерий завершения

- Selector покрывает оба staff modes и `strip`.
- Модель не содержит VexFlow-specific objects.
- Edge cases для sharp/flat keys покрыты тестами.
- `npm run test` и `npm run typecheck` проходят.

### Этап 3 — VexFlow SVG renderer

#### Цель

Добавить React/HUD-компонент, который рендерит `ScoreStaffViewModel` через VexFlow в SVG.

#### Зависит от

Этап 2.

#### Контракт этапа

- Создать `ScoreStaff` component, принимающий `ScoreStaffViewModel`, `onOpenTheory('scale')` и optional `className`.
- Renderer должен использовать VexFlow SVG backend, не canvas.
- Рендерить grand staff: treble staff сверху, bass staff снизу, визуально объединенные brace/connector если VexFlow позволяет без хаков.
- На обоих станах после clef должна быть настоящая key signature текущей тональности.
- Не рендерить time signature.
- Не добавлять локальные accidentals к диатоническим нотам; key signature должна нести знаки.
- Использовать глобальные `slotIndex` как горизонтальные позиции:
  - `staffImprovisation`: один непрерывный поток слотов; внутренние invisible rests допустимы только для выравнивания staves и не должны соответствовать внегаммовым нотам;
  - `staffPractice`: верхняя и нижняя линии имеют ноты в одних и тех же 15 slots.
- Подписи имени ноты и ступени должны быть рядом со своей нотой и своим staff.
- Finger labels показываются только если `finger !== null`.
- `highlighted` notes в `staffImprovisation` должны визуально отличаться от обычных нот и использовать цветовую семантику текущего активного аккорда.
- Component должен быть доступен как `role="img"` или эквивалентная доступная группа с `aria-label`, например `Партитура гаммы C Major, режим Импровизация`.
- Renderer должен корректно очищать старый SVG при изменении props и не накапливать DOM nodes.
- Renderer должен быть устойчив к изменению размеров: width берется из container или responsive constraints, без горизонтального scroll.

#### Не делать в этом этапе

- Не подключать component в `AppShell`.
- Не добавлять переключатель режима в меню.
- Не менять domain model ради удобства VexFlow, если это переносит renderer-specific logic в `src/music`.
- Не добавлять snapshot tests полного SVG.

#### Тесты этапа

- Component test smoke: рендерит accessible container и SVG для простой модели C Major.
- Test rerender: смена модели не оставляет больше одного актуального SVG container.
- Test labels: DOM содержит подписи нот/ступеней/fingers через stable text или `data-*`, без проверки внутренних path VexFlow.
- Test key signature contract через model/adapter boundary: renderer получает key signature для обоих staves.

#### Критерий завершения

- VexFlow renderer работает в JSDOM smoke tests или имеет изолированный adapter test с объясненным ограничением JSDOM.
- Component не пересчитывает гаммы и не вызывает domain builders.
- Нет horizontal scroll в базовом CSS component wrapper.
- `npm run test` и `npm run typecheck` проходят.

### Этап 4 — Интеграция в HUD и responsive UX

#### Цель

Подключить режим партитуры в реальное приложение, добавить трехсегментный control и проверить поведение в браузере.

#### Зависит от

Этап 3.

#### Контракт этапа

- В `TopHud` menu `Вид` добавить control с label `Вид гаммы` и options:
  - `Плашка` -> `'strip'`;
  - `Импровизация` -> `'staffImprovisation'`;
  - `Практика` -> `'staffPractice'`.
- В compact sheet `Настройки вида` добавить тот же control.
- `AppShell` должен выбирать:
  - `ScaleStrip`, если `scaleDisplayMode === 'strip'`;
  - `ScoreStaff`, если selector вернул `ScoreStaffViewModel`.
- Нижний HUD должен сохранить расположение под клавиатурой и не перекрывать основные controls incoherent образом.
- `focusMode` не должен скрывать выбранное нижнее представление гаммы.
- Кнопка `Подробнее о гамме` или эквивалентный info action должна оставаться доступной и открывать theory overlay target `scale`.
- На desktop проверить три состояния: `Плашка`, `Импровизация`, `Практика`.
- На mobile/tablet проверить, что партитура сжимается, текст не вылезает из wrapper, меню остается доступным.
- Переключение `Только гамма` должно убирать подсветку активного аккорда на партитуре `Импровизация`.
- В `Практика` активный аккорд не подсвечивается независимо от `Только гамма`.
- Включение аппликатуры добавляет finger labels только в `Практика`.

#### Не делать в этом этапе

- Не добавлять новый hotkey.
- Не менять поведение 3D-клавиатуры.
- Не менять theory overlay content, кроме сохранения existing `scale` action.
- Не добавлять horizontal scroll или отдельный полноэкранный режим.

#### Тесты этапа

- App/component test: default renders `ScaleStrip`.
- App/component test: через state/action или UI control переключается `staffImprovisation` и появляется accessible score.
- App/component test: control содержит три options и корректно вызывает `setScaleDisplayMode`.
- Regression test: `Только гамма` влияет на highlight state в model/rendered data.
- Browser verification через in-app Browser на `http://localhost:5173/`: desktop screenshot/state, narrow/mobile viewport, меню `Вид`, оба staff modes.

#### Критерий завершения

- Пользователь может выбрать все три режима без reload.
- Партитура обновляется при смене тональности/лада/аккорда/viewport.
- Нет наложений текста и controls на desktop и mobile при ручной browser-проверке.
- `npm run test`, `npm run typecheck`, `npm run lint` проходят.

### Этап 5 — Рефакторинг, чистка и полировка

#### Цель

Закрыть качество реализации после behavior этапов перед финальной проверкой.

#### Зависит от

Этап 4.

#### Контракт этапа

Must fix:

- Убрать временные helpers, transitional branches, debug logging, TODO/FIXME и dead code в области работ.
- Удалить неиспользуемые imports, locals, types, feature flags и тестовые scaffolds.
- Убрать дублирование validation, octave mapping, degree mapping, key signature mapping и active chord highlight logic.
- Сохранить одного владельца для каждого контракта: domain model в `src/music`, state selection в `src/state`, VexFlow adapter в HUD renderer.
- Проверить, что cleanup не изменил public behavior и default mode.

Inspect only:

- Декоративные переименования без снижения сложности.
- Перенос кода между модулями без явного владельца ответственности.
- Micro-optimizations VexFlow layout без измеримого UX-контракта.

Expected remaining hits:

- Упоминания `score-staff`/`ScaleDisplayMode` в этом ТЗ и журнале допустимы.
- VexFlow imports допустимы только в renderer/adapter tests, не в `src/music`.

#### Не делать в этом этапе

- Не добавлять новые features.
- Не менять зафиксированные UI labels.
- Не расширять mode union.
- Не запускать formatter/codemod по всему репозиторию.

#### Тесты этапа

- `rg "TODO|FIXME|console\\." src` для active scope; допустимые исторические совпадения должны быть объяснены.
- `rg "vexflow" src/music src/state` должен не находить production imports VexFlow.
- Focused regressions по измененным tests.
- `git diff --check`.
- `npm run test`, `npm run typecheck`, `npm run lint`.

#### Критерий завершения

- Active scope не содержит временного кода и stale comments.
- Source audit подтверждает слой ответственности.
- Все focused и project checks проходят.
- Оставшиеся риски явно записаны в журнал реализации.

## 6. Критерий полной готовности

Фича считается готовой только если выполнены все пункты:

- `package.json` и `package-lock.json` содержат `vexflow`, установленный через npm.
- По умолчанию приложение открывается в режиме `Плашка` и визуально соответствует текущему поведению.
- Меню `Вид` на desktop и compact sheet дают три состояния: `Плашка`, `Импровизация`, `Практика`.
- `Импровизация` показывает большой стан со всеми нотами выбранной гаммы в видимом диапазоне клавиатуры, без slots для внегаммовых клавиш.
- `Практика` показывает 15 slots на большом стане: верхний staff ascending, нижний staff descending, anchor около `C4`.
- Key signature отображается как настоящие знаки на обоих staves; локальные accidentals на диатонических нотах не дублируют key signature.
- Подписи нот и ступеней локальны к своим нотам; буквенное spelling соответствует выбранной тональности.
- Active chord highlight работает только в `Импровизация` и только при включенном `chordLayerEnabled`.
- Finger labels отображаются только в `Практика` и только при включенном `scaleFingeringEnabled`: верхний staff правая рука ascending, нижний staff левая рука descending.
- Партитура сжимается без горизонтального scroll и без incoherent overlap на desktop, tablet/mobile viewport.
- Browser verification выполнена на `http://localhost:5173/` после реализации.
- Проходят `npm run test`, `npm run typecheck`, `npm run lint`, `npm run build`.
- `src/music` и `src/state` не импортируют VexFlow.
- `dist` и `coverage` не редактировались вручную.
