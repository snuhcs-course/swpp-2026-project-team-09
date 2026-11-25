/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { kindShown } from '@/features/assistant/meal-kinds';
import { mealPickWords } from '@/features/assistant/meal-pick';
import { modelWordsOf } from '@/features/assistant/model-words';
import type { ShownAnswer } from '@/features/assistant/use-shown-answer';
import type { AnswerReply } from '@/api/assistant-types';
import { withParticle } from '@/features/map/short-name';
import { friendNamesOf, withFriendsOf } from './meal-list';

// The words over a meal answer's list, the first the low sheet shows (P04 ticket 61; the dock's rule, PR 477's and PR
// 545's reviews): the Assistant's own words while they are about the place on screen, its first pick of the answer it
// came with. Once another place is chosen, or the answer recalculated, or without the model's words, the chosen place's
// own line ("302동식당 · 11:30 · 걸음 2분 · 순살안동식찜닭 외 2 · 5,000원부터"), ending with whom when the Plan has
// Friends ("· 김태현 외 2명과", P04 ticket 64, board p13), so that the card says what is chosen now; when only one place is left of many, that it alone fits ("김태현과 시간이 맞는 곳은 302동식당뿐이에요 · 11:30 ·
// 걸음 2분"). Empty with no place to name.
export function mealWordsOf(said: string, shown: Pick<ShownAnswer, 'answer' | 'source' | 'index' | 'plan'>): string {
  const words = modelWordsOf(said);
  const { answer, source, index, plan } = shown;
  if (words !== '' && answer === source && index === 0) {
    return words;
  }
  if (plan === null || answer === null) {
    return words;
  }
  if (answer.plans.length === 1 && answer.dropped.length > 0) {
    const { note } = mealPickWords(plan, plan.place.label, kindShown(answer));
    const who = withFriendsOf(answer);
    return `${who === null ? '시간이 맞는 곳은' : `${who} 시간이 맞는 곳은`} ${plan.place.label}뿐이에요 · ${note}`;
  }
  const { name } = mealPickWords(plan, plan.place.label, kindShown(answer));
  const company = companyOf(answer);
  return company === null ? name : `${name} · ${company}`;
}

// The Plan's Friends, the first by name and the rest counted: "김태현과", "김태현 외 2명과".
function companyOf(answer: AnswerReply): string | null {
  const [first, ...rest] = friendNamesOf(answer);
  if (first === undefined) {
    return null;
  }
  return withParticle(rest.length === 0 ? first : `${first} 외 ${rest.length}명`);
}
