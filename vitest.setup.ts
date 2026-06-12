import { vi } from 'vitest';

// jsdom не реализует layout-API браузера, которые использует UI.
window.matchMedia ??= (query: string): MediaQueryList =>
  ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  }) as MediaQueryList;

Element.prototype.scrollIntoView ??= () => {};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  configurable: true,
  value: vi.fn(() => ({
    measureText: (text: string) => ({
      width: text.length * 6,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
      actualBoundingBoxLeft: 0,
      actualBoundingBoxRight: text.length * 6,
      fontBoundingBoxAscent: 8,
      fontBoundingBoxDescent: 2,
      emHeightAscent: 8,
      emHeightDescent: 2,
      hangingBaseline: 6,
      alphabeticBaseline: 0,
      ideographicBaseline: -2
    })
  }))
});
