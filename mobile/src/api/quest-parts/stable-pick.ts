/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// A number for a Quest's id that is the same on every phone and at every start (FNV-1a), so that a Quest of the main
// server always gets the same mocked parts.
export function stableHash(id: string): number {
  let hash = 0x81_1c_9d_c5;
  for (const char of id) {
    hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 0x01_00_01_93) >>> 0;
  }
  return hash;
}

// One of the set, by the Quest's id.
export function pickFor<Item>(id: string, set: readonly Item[]): Item {
  const item = set[stableHash(id) % set.length];
  if (item === undefined) {
    throw new Error('An empty set has nothing to pick.');
  }
  return item;
}
