export const SCENE_COLORS = {
  background: '#0a0d13',
  fog: '#0a0d13',
  floor: '#151921',
  floorPool: '#272e3c',
  wall: '#0e1219',
  /** Тинты поверх процедурной текстуры дерева: near-white = натуральный цвет. */
  body: '#ffffff',
  bodyEdge: '#cfc6bf',
  felt: '#8c1f2d',
  brass: '#c9a05a',
  whiteKey: '#fdfaf2',
  blackKey: '#0e0e12'
} as const;

/**
 * Единая янтарная шкала подсветки: гамма — приглушенная бронза,
 * тоника и активный аккорд — яркое золото. Красный зарезервирован
 * только под напряженный diminished.
 */
export const HIGHLIGHT_COLORS = {
  inScale: '#c89a55',
  tonic: '#ffc14f',
  activeChord: '#ffb13c',
  diminished: '#e25c4a',
  midiPressed: '#4bdcff'
} as const;
