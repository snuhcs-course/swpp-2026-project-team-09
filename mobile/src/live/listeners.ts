/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// What the listeners of one signal share: the set of them, and the reading of a payload's fields.

export interface Listeners<Value> {
  // Gives the way to stop listening.
  add: (listener: (value: Value) => void) => () => void;
  tell: (value: Value) => void;
}

export function listenersOf<Value>(): Listeners<Value> {
  const listeners = new Set<(value: Value) => void>();
  return {
    add: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    tell: (value) => {
      for (const listener of listeners) {
        listener(value);
      }
    },
  };
}

export function fieldOf(value: unknown, name: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, name) : undefined;
}

export function text(value: unknown, name: string): string | undefined {
  const found = fieldOf(value, name);
  return typeof found === 'string' ? found : undefined;
}
