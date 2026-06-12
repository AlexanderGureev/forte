import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three';

/** Детерминированный PRNG (mulberry32), чтобы рисунок дерева был одинаковым между загрузками. */
function createRandom(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WOOD_GRAIN_COLORS = ['#0e0d0c', '#332e29', '#453f38', '#1a1816', '#5a5249', '#262220'];

/** Чёрное сатиновое дерево, как у Kawai: угольная база с читаемыми волокнами. */
function paintWood(context: CanvasRenderingContext2D, width: number, height: number): void {
  const random = createRandom(11);

  const base = context.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, '#272320');
  base.addColorStop(0.45, '#1e1b18');
  base.addColorStop(1, '#2a2521');
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);

  for (let i = 0; i < 160; i += 1) {
    const y = random() * height;
    const amplitude = 1 + random() * 3;
    const wavelength = 160 + random() * 260;
    const phase = random() * Math.PI * 2;

    context.beginPath();
    context.moveTo(0, y + Math.sin(phase) * amplitude);

    for (let x = 24; x <= width; x += 24) {
      context.lineTo(x, y + Math.sin(x / wavelength + phase) * amplitude);
    }

    context.strokeStyle = WOOD_GRAIN_COLORS[Math.floor(random() * WOOD_GRAIN_COLORS.length)];
    context.globalAlpha = 0.1 + random() * 0.2;
    context.lineWidth = 0.6 + random() * 3.5;
    context.stroke();
  }

  context.globalAlpha = 1;
}

/** Слоновая кость: тёплая база с едва заметными прожилками вдоль клавиши. */
function paintIvory(context: CanvasRenderingContext2D, width: number, height: number): void {
  const random = createRandom(5);

  context.fillStyle = '#f7f1e2';
  context.fillRect(0, 0, width, height);

  for (let i = 0; i < 70; i += 1) {
    const x = random() * width;

    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x + (random() - 0.5) * 16, height);
    context.strokeStyle = random() > 0.45 ? '#e8dcc3' : '#fffaec';
    context.globalAlpha = 0.04 + random() * 0.08;
    context.lineWidth = 1 + random() * 3;
    context.stroke();
  }

  context.globalAlpha = 1;
}

function createTexture(
  width: number,
  height: number,
  paint: (context: CanvasRenderingContext2D, width: number, height: number) => void
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');

  if (context !== null) {
    paint(context, width, height);
  }

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.anisotropy = 8;

  return texture;
}

let woodTexture: CanvasTexture | null = null;
let ivoryTexture: CanvasTexture | null = null;

export function getWoodTexture(): CanvasTexture {
  woodTexture ??= createTexture(1024, 512, paintWood);
  return woodTexture;
}

export function getIvoryTexture(): CanvasTexture {
  ivoryTexture ??= createTexture(256, 256, paintIvory);
  return ivoryTexture;
}
