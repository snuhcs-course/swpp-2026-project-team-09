// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by AhnJinYoung
// A text's length as the form counts it everywhere: in characters as Unicode numbers them, so that an emoji is one
// and not the two units a phone's keyboard counts. The main server counts the same way.
export function lengthOf(words: string): number {
  return Array.from(words).length;
}

// The text's first characters. It is never cut inside one, as a limit on the field itself would.
export function cut(words: string, most: number): string {
  const characters = Array.from(words);
  return characters.length <= most ? words : characters.slice(0, most).join('');
}
