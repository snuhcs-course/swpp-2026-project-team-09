/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

export interface TypingWords {
  // What stands above the keyboard: the reply's question sentence, or its first sentence.
  words: string;
  // The reply asks something: its question is shown whole, up to three lines, and nothing else of the reply.
  asks: boolean;
  // The example of an answer, from a sentence that starts with "예를 들어", for the input's placeholder; null for none.
  example: string | null;
}

// A sentence ends at ".", "?" or "!" followed by a space or a line's end, so that "0.8km" stays whole (PR 479's review).
const BETWEEN_SENTENCES = /(?<=[.?!])\s+|\n+/u;
const EXAMPLE = /^예를 들어\s*(.+?)처럼/u;

// What stands above the keyboard while the User answers the reply on screen (the rule of 2026-11-22): the sentence that
// asks, whole, when there is one (the last that ends in "?"), its example ("예를 들어 14:00부터 16:00처럼 알려 주세요")
// moved into the input's placeholder ("예: 14:00부터 16:00"); else the reply's first sentence.
export function typingWordsOf(text: string): TypingWords {
  const sentences = text
    .split(BETWEEN_SENTENCES)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence !== '');
  const question = sentences.findLast((sentence) => sentence.endsWith('?'));
  if (question === undefined) {
    return { words: sentences[0] ?? '', asks: false, example: null };
  }
  const example = sentences.map((sentence) => EXAMPLE.exec(sentence)?.[1]).find((found) => found !== undefined);
  return { words: question, asks: true, example: example === undefined ? null : `예: ${example}` };
}
