/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The main server's stand-in for a reply that has no words of the model's (its `wordless-reply.ts`), which replies
// kept on phones still hold.
const STAND_IN = '아래에서 확인해 보세요.';

// The model's own words of a reply, trimmed; none for a blank text or the stand-in sentence (P04 ticket 18), so that a
// Lookup without them shows its own headline and is read back as its lines alone.
export function modelWordsOf(text: string): string {
  const words = text.trim();
  return words === STAND_IN ? '' : words;
}
