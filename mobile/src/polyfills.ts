// Expo Go's JavaScript engine on Android has no `Array.prototype.toSorted` (ES2023), which the app uses; the Hermes of a
// development or release build has it, and so does Node, where the tests run. The root layout imports this file first.

function toSorted<Item>(this: Item[], compare?: (one: Item, other: Item) => number): Item[] {
  // oxlint-disable-next-line unicorn/no-array-sort -- it sorts a copy, which is what `toSorted` does
  return [...this].sort(compare);
}

if (!('toSorted' in Array.prototype)) {
  // oxlint-disable-next-line no-extend-native -- a polyfill of a standard method, added only where it is missing
  Object.defineProperty(Array.prototype, 'toSorted', { value: toSorted, writable: true, configurable: true });
}
