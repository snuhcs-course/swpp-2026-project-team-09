/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply } from '@/api/assistant-types';
import { objectParticle, withParticle } from '@/features/map/short-name';
import { koreaClock } from '@/korea-time';
import { invitedNamesOf } from './invited-words';

// The words over an answer on screen, for every kind (P04 ticket 97). The main server sends no words with a
// recalculation (moving the bar, "＋ 같이", a chip, the bar's other meal), so the reply's sentence stays through it,
// unless it names a place, or a time, the recalculated answer no longer has first: then one plain sentence from the
// answer in the model's tone, "302동식당을 추천해요.", with the time when it moved ("12:30에 …") and whom with
// ("김민수와 …"). A reply without the model's words gets that sentence too. This replaces P04 ticket 61's rule for a
// meal, the chosen place's own row ("302동식당 · 11:30 · 걸음 4분 · …"), which only said the list's row again and which
// the user found stiff (2026-11-28); every other kind kept the reply's words even when they no longer held.
export function recalculatedWords(
  said: string,
  { answer, source }: { answer: AnswerReply | null; source: AnswerReply | null },
): string {
  const [first] = answer?.plans ?? [];
  if (answer === null || first === undefined) {
    return said;
  }
  const recalculated = source !== null && answer.plans !== source.plans;
  const [was] = source?.plans ?? [];
  const moved = recalculated && was !== undefined && was.startAt !== first.startAt;
  if (said !== '' && !(recalculated && stale(said, source, first.place.label, moved ? was : undefined))) {
    return said;
  }
  const time = moved ? `${koreaClock(first.startAt)}에 ` : '';
  const place = first.place.label;
  return `${time}${companyOf(answer)}${place}${objectParticle(place)} 추천해요.`;
}

// Whether the reply's sentence names a place of its own answer that is not the recalculated answer's first, or the
// time its first started at, which moved.
function stale(
  said: string,
  source: AnswerReply | null,
  first: string,
  moved: { startAt: string } | undefined,
): boolean {
  const places = (source?.plans ?? []).map(({ place }) => place.label);
  const gone = places.some((label) => label !== first && said.includes(label));
  return gone || (moved !== undefined && said.includes(koreaClock(moved.startAt)));
}

// "김민수와 ", "김민수 외 2명과 ": the answer's Friends as its chips name them, or nothing for the User alone.
function companyOf(answer: AnswerReply): string {
  const [name, ...rest] = invitedNamesOf(answer.chips);
  if (name === undefined) {
    return '';
  }
  return `${withParticle(rest.length === 0 ? name : `${name} 외 ${String(rest.length)}명`)} `;
}
