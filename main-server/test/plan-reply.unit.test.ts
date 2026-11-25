/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { withoutWalkSentences } from '../src/assistant/gathering/plan-reply.js';

// The reply of a meal's answer keeps to the one sentence about the first plan: a later sentence that gives a walk in
// minutes goes, since the app writes the ways and their minutes on the map (the user's phone, 2026-11-26). Expected
// values: the reply as the rules allow it.

// Partitions: a later sentence with a walk, said as 도보, 걸어서, and 걸려; the sentences the rules allow after the
// first; a first sentence with a walk; a reply with no Plan drawn.
describe("A meal reply's sentences", () => {
  it.each([
    ['예술계식당이 가장 가까워서 17:00에 먹어요. 83동에서 도보 3분이에요.'],
    ['예술계식당이 가장 가까워서 17:00에 먹어요. 걸어서 3분이면 가요.'],
    ['예술계식당이 가장 가까워서 17:00에 먹어요. 83동에서 3분 걸려요.'],
  ])('drops a later sentence that gives a walk: %s', (text) => {
    expect(withoutWalkSentences(text, true)).toBe('예술계식당이 가장 가까워서 17:00에 먹어요.');
  });

  it.each([
    ['이미 민수와 12:16 302동식당 점심이 있어요. 바꿀까요?'],
    [
      '15:30 302동 수업까지 가장 덜 걸어서 3식당을 먼저 골랐어요. 302동식당과 301동식당은 13:30엔 나서야 해서 25분뿐이에요.',
    ],
    ['301동식당이 가장 가까워서 11:00에 먹어요. 어디서 출발해요?'],
    ['83동에서 도보 3분인 예술계식당에서 17:00에 먹어요.'],
  ])('keeps a reply the rules allow: %s', (text) => {
    expect(withoutWalkSentences(text, true)).toBe(text);
  });

  it('leaves a reply with no Plan drawn as it is', () => {
    const way = '정문까지 걸어서 5분이에요. 셔틀은 2분 뒤에 와요.';

    expect(withoutWalkSentences(way, false)).toBe(way);
  });
});
