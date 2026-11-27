/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { RequestContext } from '@/api/assistant-types';
import type { MentionedContext } from '@/api/mention-types';
import { leftOutOf, sentLeftOut } from './left-out';
import { withSaidOf } from './mentions';
import type { ChatBubble } from './use-chat';

// The context a request of the conversation `bubbles` carries. The conditions and the Plan on screen belong to the
// conversation whose reply drew them: a conversation without a reply yet, such as one just started on the main map
// (`sendNew`) or by "＋ 새 대화", sends neither, although the answer of the one before is still kept for a render (P04
// ticket 47). What was pressed on the map stays: it is what the User sees now. The conversation's Classes left out, as
// its latest reply gave them and a ✕ left them, go with every request of it (P01 ticket 40).
export function contextFor(
  context: RequestContext,
  bubbles: readonly Pick<ChatBubble, 'role' | 'failure' | 'tapped' | 'mentions' | 'skipped'>[],
): MentionedContext {
  const said = { ...withSaidOf(context, bubbles), ...sentLeftOut(leftOutOf(bubbles)) };
  const replied = bubbles.some(({ role, failure }) => role === 'assistant' && failure === null);
  if (replied) {
    return said;
  }
  const { planIds: _listed, ...rest } = said;
  return { ...rest, conditions: null, planId: null };
}
