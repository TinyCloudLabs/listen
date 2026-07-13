import "@testing-library/jest-dom/vitest";

const data = new Map<string, string>();
const storage = {
  get length() {
    return data.size;
  },
  key: (index: number) => [...data.keys()][index] ?? null,
  getItem: (key: string) => data.get(key) ?? null,
  setItem: (key: string, value: string) => data.set(key, value),
  removeItem: (key: string) => data.delete(key),
  clear: () => data.clear(),
};

Object.defineProperty(window, "localStorage", { value: storage, configurable: true });
Object.defineProperty(globalThis, "localStorage", { value: storage, configurable: true });
