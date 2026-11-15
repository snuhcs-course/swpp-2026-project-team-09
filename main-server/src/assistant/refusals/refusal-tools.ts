/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type FriendViewService } from '../../friends/friend-view.service.js';
import { type PlaceLookup } from '../../places/place-lookup.js';
import { defineTool, type NoneFound, noneFound, type Tool, type ToolContext } from '../feature.js';
import { type UserDayService } from '../free-time/user-day.service.js';
import { placeLabelOf } from '../gathering/place-naming.js';
import { koreaDate } from '../korea-time.js';
import { friendLookup } from '../lookup/friend.service.js';
import {
  FRIEND_KINDS,
  type FriendKind,
  PLACE_KINDS,
  type PlaceKind,
  type Refusal,
  REFUSE_KINDS,
  type RefuseKind,
} from './refusal.dto.js';
import { friendNowLine, friendRefusal, placeRefusal, plainRefusal, standsBeside } from './refusals.js';

// The refusal presenter of an app that draws answers: the model names the case, and the server writes the words and
// the buttons from its table, a Friend's name and what is seen of them from the Friend view, a library's from the
// Places.

// What the words of a Friend are read from: the Friend view, the Friend's Classes of the day, and the Places.
export interface RefusalSources {
  friends: Pick<FriendViewService, 'list'>;
  days: Pick<UserDayService, 'itemsOn'>;
  places: Pick<PlaceLookup, 'byId' | 'nearTo'>;
}

const input = z.object({
  kind: z.enum(REFUSE_KINDS).describe('The case, as the rules of refuse name it.'),
  userId: z
    .uuid()
    .optional()
    .describe(
      "For past-location, others-sharing, not-watched-friend, course-and-room and for-someone-else: the Friend's id, as resolveFriend returned it in this message or [Tapped: friend …] gives it. Left out for the other cases.",
    ),
  placeId: z
    .uuid()
    .optional()
    .describe(
      'For other-library: the library, as resolvePlace returned it in this message or [Tapped: place …] gives it. Left out for the other cases.',
    ),
});

type Input = z.output<typeof input>;

const isFriendKind = (kind: RefuseKind): kind is FriendKind => FRIEND_KINDS.some((each) => each === kind);

const isPlaceKind = (kind: RefuseKind): kind is PlaceKind => PLACE_KINDS.some((each) => each === kind);

async function friendWords(
  sources: RefusalSources,
  kind: FriendKind,
  friendId: string,
  { userId, now }: ToolContext,
): Promise<Refusal> {
  const { friends, days, places } = sources;
  const friend = (await friends.list(userId)).find(({ id }) => id === friendId);
  if (friend === undefined) {
    return plainRefusal('not-a-friend');
  }
  const { name } = friend;
  if (kind === 'course-and-room') {
    const answer = await friendLookup(sources, userId, friendId, now);
    return answer === null ? plainRefusal('not-a-friend') : friendRefusal(kind, { name, seen: answer.unseen });
  }
  if (kind !== 'past-location') {
    return friendRefusal(kind, { name, seen: [] });
  }
  const classes = (await days.itemsOn(friendId, koreaDate(now))).filter(({ isClass }) => isClass);
  const placeLabel = (placeId: string): string | null => {
    const place = places.byId(placeId);
    return place === null ? null : placeLabelOf(place);
  };
  const seen = friendNowLine(friend, classes, now, placeLabel);
  return friendRefusal(kind, { name, seen: [{ text: seen, strong: false }] });
}

function placeWords(
  { places }: RefusalSources,
  kind: PlaceKind,
  placeId: string,
  context: ToolContext,
): Refusal | NoneFound {
  const tapped = context.context.tapped?.kind === 'place' ? context.context.tapped.placeId : null;
  context.found.refuseUnfound('place', placeId === tapped ? [] : [placeId]);
  const place = places.byId(placeId);
  return place === null ? noneFound('There is no such Place.') : placeRefusal(kind, place.name);
}

function refusalFor(
  sources: RefusalSources,
  { kind, userId: friendId, placeId }: Input,
  context: ToolContext,
): Refusal | NoneFound | Promise<Refusal | NoneFound> {
  if (isPlaceKind(kind)) {
    return placeId === undefined
      ? noneFound(`${kind} names a library: find it with resolvePlace and give its placeId.`)
      : placeWords(sources, kind, placeId, context);
  }
  if (!isFriendKind(kind)) {
    return plainRefusal(kind);
  }
  if (friendId === undefined) {
    return noneFound(
      `${kind} names a Friend: find them with resolveFriend and give their userId. When resolveFriend answers none, refuse with not-a-friend.`,
    );
  }
  return friendWords(sources, kind, friendId, context);
}

export function refuse(sources: RefusalSources): Tool {
  return defineTool({
    description:
      "Refuses a request the app cannot or will not answer, one of the cases its rules list. The app shows the server's words for the case and buttons of what it can do instead; write nothing beside the call or after it.",
    input,
    run: async (asked, context) => {
      const { presented } = context;
      const { answer, lookup } = presented;
      if (answer !== null || (lookup !== null && !standsBeside(asked.kind, lookup))) {
        return { result: 'not shown', reason: 'The app already draws an answer on the map.' };
      }
      const refusal = await refusalFor(sources, asked, context);
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
export const REFUSAL_RULES = `A request the app cannot or will not answer is refused with refuse: the server writes the words, and the app shows them with buttons of what it can do instead. These rules come before the lines above on declining general work, on small talk, on where a Friend is, and on asking which Friend.

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
  - course-and-room: a Friend's course, class name, or room (민수 지금 무슨 수업 들어?, 지은이 어느 강의실이야?). The app never shows them; where and when the Class ends is shown.
  - other-library: booking a room or a seat at a library other than 관정, which the app does not book (신양 스터디룸 예약해 줘).
  - for-someone-else: accepting, declining, or answering an invitation in a Friend's place (민수 대신 수락해 줘).
- For past-location, others-sharing, not-watched-friend, course-and-room and for-someone-else, first find the Friend with resolveFriend and give their userId, or take it from [Tapped: friend …]. When resolveFriend answers none, refuse with not-a-friend; when it answers several, ask which one.
- When resolveFriend answers several with a note that the app asks which one, the app shows the question with a cell for each candidate: write nothing beside the call or after it, and call nothing else. The User's choice comes back as the Friend's full name with [Tapped: friend …], which gives their id.
- course-and-room and other-library also answer, on the map, the part that can be answered, in the same message: for course-and-room, call findFriend with the Friend too; for other-library, find the library with resolvePlace, call findWay with it as to, and give it to refuse as placeId. The app draws the Friend or the way with the refusal's words, so write nothing there either, not even the one sentence the rules of findFriend and findWay ask for.
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
