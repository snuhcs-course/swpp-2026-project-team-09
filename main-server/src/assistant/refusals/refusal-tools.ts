/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type FriendViewService } from '../../friends/friend-view.service.js';
import { type PlaceLookup } from '../../places/place-lookup.js';
import { defineTool, type NoneFound, noneFound, type Tool } from '../feature.js';
import { type UserDayService } from '../free-time/user-day.service.js';
import { placeLabelOf } from '../gathering/place-naming.js';
import { koreaDate } from '../korea-time.js';
import { FRIEND_KINDS, type FriendKind, type Refusal, REFUSAL_KINDS, type RefusalKind } from './refusal.dto.js';
import { friendNowLine, friendRefusal, plainRefusal } from './refusals.js';

// The refusal presenter of an app that draws answers: the model names the case, and the server writes the words and
// the buttons from its table, a Friend's name and where they are now from the Friend view.

// What the words of a Friend are read from: the Friend view, the Friend's Classes of the day, and Place names.
export interface RefusalSources {
  friends: Pick<FriendViewService, 'list'>;
  days: Pick<UserDayService, 'itemsOn'>;
  places: Pick<PlaceLookup, 'byId'>;
}

const input = z.object({
  kind: z.enum(REFUSAL_KINDS).describe('The case, as the rules of refuse name it.'),
  userId: z
    .uuid()
    .optional()
    .describe(
      "For past-location, others-sharing and not-watched-friend: the Friend's id, as resolveFriend returned it in this message or [Tapped: friend …] gives it. Left out for the other cases.",
    ),
});

const isFriendKind = (kind: RefusalKind): kind is FriendKind => FRIEND_KINDS.some((each) => each === kind);

async function refusalFor(
  { friends, days, places }: RefusalSources,
  kind: RefusalKind,
  friendId: string | undefined,
  { userId, now }: { userId: string; now: Date },
): Promise<Refusal | NoneFound> {
  if (!isFriendKind(kind)) {
    return plainRefusal(kind);
  }
  if (friendId === undefined) {
    return noneFound(
      `${kind} names a Friend: find them with resolveFriend and give their userId. When resolveFriend answers none, refuse with not-a-friend.`,
    );
  }
  const friend = (await friends.list(userId)).find(({ id }) => id === friendId);
  if (friend === undefined) {
    return plainRefusal('not-a-friend');
  }
  if (kind !== 'past-location') {
    return friendRefusal(kind, { name: friend.name, now: '' });
  }
  const classes = (await days.itemsOn(friendId, koreaDate(now))).filter(({ isClass }) => isClass);
  const placeLabel = (placeId: string): string | null => {
    const place = places.byId(placeId);
    return place === null ? null : placeLabelOf(place);
  };
  return friendRefusal(kind, { name: friend.name, now: friendNowLine(friend, classes, now, placeLabel) });
}

export function refuse(sources: RefusalSources): Tool {
  return defineTool({
    description:
      "Refuses a request the app cannot or will not answer, one of the cases its rules list. The app shows the server's words for the case and buttons of what it can do instead; write nothing beside the call or after it.",
    input,
    run: async ({ kind, userId: friendId }, context) => {
      const { presented } = context;
      if (presented.answer !== null || presented.lookup !== null) {
        return { result: 'not shown', reason: 'The app already draws an answer on the map.' };
      }
      const refusal = await refusalFor(sources, kind, friendId, context);
      if ('result' in refusal) {
        return refusal;
      }
      presented.refusal = refusal;
      return {
        result: 'shown',
        kind: refusal.kind,
        note: 'The app shows the words and the buttons. Write nothing more.',
      };
    },
  });
}

// The rules of refuse, a fragment of the chat's system prompt for an app that draws answers.
export const REFUSAL_RULES = `A request the app cannot or will not answer is refused with refuse: the server writes the words, and the app shows them with buttons of what it can do instead. These rules come before the lines above on declining general work, on small talk, and on where a Friend is.

- Call refuse for each case below, in place of declining in your own words, and write nothing beside the call or after it:
  - off-campus: anything off campus, such as a restaurant, a place, or an event outside SNU (강남역 맛집 추천해 줘).
  - general-work: work that is not campus life, such as homework, a report, an essay, a translation, or code (자료구조 과제 풀어 줘).
  - vague: words that want something to do and name nothing (심심해, 뭐 하지).
  - not-understood: words that cannot be read as a request, such as initials or stray letters (ㅂㄱㅍ).
  - not-a-friend: where someone is, or their Timetable, when they are not the User's Friend: resolveFriend answers none, or they are named by a role, such as a TA or a professor (우리 과 조교님 어디 계셔?).
  - who-looked: who looked for or at the User's location (누가 내 위치 찾아봤어?).
  - past-location: where a Friend was before now (민수 어제 어디 있었어?).
  - others-sharing: changing what a Friend shares, such as turning their location on (민수 위치 켜 줘).
  - not-watched-friend: telling the User later when they meet or pass a Friend (민수랑 마주칠 때 알려 줘).
  - not-watched-shuttle: telling the User later when the shuttle comes (셔틀 오면 알려 줘). Asking when the shuttle comes now is not this case.
- For past-location, others-sharing and not-watched-friend, first find the Friend with resolveFriend and give their userId, or take it from [Tapped: friend …]. When resolveFriend answers none, refuse with not-a-friend; when it answers several, ask which one.
- Greetings and thanks are answered in a short sentence, not refused.`;

// An app that draws answers also gets refuse and its rules.
export function withRefusals(
  planned: { rules: string[]; tools: Record<string, Tool> },
  sources: RefusalSources,
  drawsAnswers: boolean,
): { rules: string[]; tools: Record<string, Tool> } {
  if (!drawsAnswers) {
    return planned;
  }
  return { rules: [...planned.rules, REFUSAL_RULES], tools: { ...planned.tools, refuse: refuse(sources) } };
}
