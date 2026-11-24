import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";

export const observed = { resize: [], intersection: [] };
export const preference = { reduced: false };

class TestResizeObserver {
  constructor(callback) { this.callback = callback; this.disconnected = false; observed.resize.push(this); }
  observe() {}
  disconnect() { this.disconnected = true; }
}
class TestIntersectionObserver {
  constructor(callback) { this.callback = callback; this.disconnected = false; observed.intersection.push(this); }
  observe() {}
  disconnect() { this.disconnected = true; }
}
vi.stubGlobal("ResizeObserver", TestResizeObserver);
vi.stubGlobal("IntersectionObserver", TestIntersectionObserver);
Object.defineProperty(document, "hidden", { configurable: true, get: () => false });

window.matchMedia = vi.fn((media) => ({
  media,
  get matches() { return preference.reduced; },
  addEventListener() {},
  removeEventListener() {},
}));

HTMLCanvasElement.prototype.getContext = function getContext() {
  return new Proxy(
    { createRadialGradient: () => ({ addColorStop() {} }) },
    {
      get(target, property) {
        if (property in target) return target[property];
        return (...args) => {
          if (args.some((value) => typeof value === "number" && !Number.isFinite(value))) {
            throw new Error(`Non-finite canvas coordinate in ${String(property)}`);
          }
        };
      },
    },
  );
};
HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
  width: 680, height: 485, x: 0, y: 0, left: 0, top: 0, right: 680, bottom: 485,
});

afterEach(() => {
  cleanup();
  preference.reduced = false;
  observed.resize.length = 0;
  observed.intersection.length = 0;
});
