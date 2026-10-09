// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-10-06 to 2026-10-08, prompted by Jaehyun0320 and fyoon46
// Hermes, the JavaScript engine of the Android builds and of Expo Go, lacks the ES2023 array methods the app uses;
// Node, where the tests run, has them. The app's entry (`index.ts`) imports this file before anything else, because the
// mocks call `toSorted` while their modules load.

type Compare<Item> = (one: Item, other: Item) => number;
type Predicate<Item> = (item: Item, index: number, array: Item[]) => boolean;

const polyfills: Record<string, (this: unknown[], ...args: never[]) => unknown> = {
  toSorted<Item>(this: Item[], compare?: Compare<Item>): Item[] {
    // oxlint-disable-next-line unicorn/no-array-sort -- it sorts a copy, which is what `toSorted` does
    return [...this].sort(compare);
  },
  toReversed<Item>(this: Item[]): Item[] {
    // oxlint-disable-next-line unicorn/no-array-reverse -- it reverses a copy, which is what `toReversed` does
    return [...this].reverse();
  },
  with<Item>(this: Item[], index: number, value: Item): Item[] {
    const copy = [...this];
    copy[index < 0 ? copy.length + index : index] = value;
    return copy;
  },
  findLast<Item>(this: Item[], predicate: Predicate<Item>): Item | undefined {
    for (let index = this.length - 1; index >= 0; index -= 1) {
      if (predicate(this[index], index, this)) return this[index];
    }
    return undefined;
  },
  findLastIndex<Item>(this: Item[], predicate: Predicate<Item>): number {
    for (let index = this.length - 1; index >= 0; index -= 1) {
      if (predicate(this[index], index, this)) return index;
    }
    return -1;
  },
};

for (const [name, value] of Object.entries(polyfills)) {
  if (!(name in Array.prototype)) {
    // oxlint-disable-next-line no-extend-native -- a polyfill of a standard method, added only where it is missing
    Object.defineProperty(Array.prototype, name, { value, writable: true, configurable: true });
  }
}
