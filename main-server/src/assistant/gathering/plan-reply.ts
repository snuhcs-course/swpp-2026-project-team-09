/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// A sentence that gives someone's walk in minutes ("83동에서 도보 3분이에요", "걸어서 5분 걸려요"): the app draws the
// ways and writes their minutes on the map, and nowhere else (the meal rules: nobody's minutes on the way).
const WALK_MINUTES = /(?:도보|걸어서|걸음으로|걸음)\s*\d+\s*분|\d+\s*분\s*(?:정도\s*)?(?:걸려|걸어|거리)/u;

// A reply's sentences, each with what ends it and the space after it.
const SENTENCES = /[^.!?]+(?:[.!?]+\s*|$)/gu;

// The reply, when its answer draws a Plan, without a sentence after the first that gives a walk in minutes. On the
// user's phone (2026-11-26), "저녁" was answered "예술계식당이 가장 가까워서 17:00에 먹어요. 83동에서 도보 3분이에요."
// although the rules ask for one sentence. The first sentence always stays, and so do the others the rules allow: a
// question back, fellBack's, a meal already set. A reply with no Plan on screen, such as a way's, is left as it is.
export function withoutWalkSentences(text: string, drawsPlan: boolean): string {
  if (!drawsPlan) {
    return text;
  }
  const [first = '', ...rest] = text.match(SENTENCES) ?? [];
  return [first, ...rest.filter((sentence) => !WALK_MINUTES.test(sentence))].join('').trim();
}
