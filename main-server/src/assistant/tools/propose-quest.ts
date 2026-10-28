/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { FriendsService } from '../../friends/friends.service.js';
import { type PublishedGlobalEventDto } from '../../global-events/dto/global-event.dto.js';
import { GlobalEventsService } from '../../global-events/global-events.service.js';
import { JoinPolicy, QuestBoard } from '../../generated/prisma/client.js';
import { PlacesService } from '../../places/places.service.js';
import { makeQuestSchema } from '../../quests/dto/quest-requests.dto.js';
import { defineTool, type Tool, type ToolContext } from '../feature.js';
import { type FoundKind } from '../found-ids.js';
import { koreaTime } from '../korea-time.js';
import {
  type ProposalFriend,
  type ProposalPlace,
  proposalForModel,
  type QuestProposal,
  sentProposalOf,
} from '../proposal.js';
import { recordPlaceChange } from './resolved.js';

// The services proposeQuest checks the resolved ids with.
export interface ProposeQuestServices {
  friends: FriendsService;
  places: PlacesService;
  globalEvents: GlobalEventsService;
}

// Every field may be left out, and an id may be any text, so that the tool, not the model library, says which are
// missing or wrong.
const input = z.object({
  title: z.string().optional().describe('The 파티 title, short, as its post shows it.'),
  description: z
    .string()
    .optional()
    .describe(
      "The recruiting post's text. When the User gave none for a 공개 파티, write a short one from their request.",
    ),
  joinPolicy: z
    .enum(JoinPolicy)
    .optional()
    .describe(
      'open (공개, 바로 참여): anyone joins at once; approval (공개, 승인 후 참여): the User approves each; closed (비공개): only the invited Friends, on no Board.',
    ),
  board: z
    .enum(QuestBoard)
    .optional()
    .describe(
      'The Board a 공개 파티 is posted on: meal 식사, career 진로, hobby 취미 (운동 too), show 공연. None for 비공개.',
    ),
  capacity: z.number().optional().describe('How many people the 파티 holds, the User included.'),
  startsAt: z
    .string()
    .optional()
    .describe(
      'When it starts, as an ISO date and time with its offset, such as 2027-01-05T12:00:00+09:00. With a Global Event, leave it out to start at the event, or give a meeting time before it.',
    ),
  placeId: z
    .string()
    .optional()
    .describe('Where it meets: the id resolvePlace returned, or the one in [Proposal shown: …].'),
  globalEventId: z
    .string()
    .optional()
    .describe('The related event: the id resolveGlobalEvent returned, or the one in [Proposal shown: …].'),
  inviteeIds: z
    .array(z.string())
    .optional()
    .describe('The Friends to invite: ids resolveFriend returned, or those in [Proposal shown: …].'),
});

type Input = z.output<typeof input>;

// What is missing or wrong, by field, worded for the model to ask the User.
type FieldFailures = Partial<Record<keyof Input, string>>;

function isField(name: unknown): name is keyof Input {
  return typeof name === 'string' && Object.hasOwn(input.shape, name);
}

// What one id of the input names, checked again, or why it was refused.
type Checked<T> = { value: T } | { failure: string };

// What the ids of the input name, each checked again, and what failed of them.
interface Resolved {
  place: ProposalPlace | null;
  globalEvent: PublishedGlobalEventDto | null;
  invitees: ProposalFriend[];
  failures: FieldFailures;
}

// An id is taken only when a resolver returned it in this message, the User chose it in their last message, or it is
// in the last Proposal sent back.
function accepted({ found }: ToolContext, kind: FoundKind, id: string, shownIds: readonly string[]): boolean {
  return found.has(kind, id) || shownIds.includes(id);
}

const UNRETURNED =
  'No resolver returned this id in this message, and it is not in the last Proposal. Call the resolver with the User’s words.';

async function placeOf(placeId: string, context: ToolContext, places: PlacesService): Promise<Checked<ProposalPlace>> {
  if (!accepted(context, 'place', placeId, context.shown?.place ? [context.shown.place.id] : [])) {
    return { failure: UNRETURNED };
  }
  const place = (await places.list()).find(({ id }) => id === placeId);
  return place === undefined
    ? { failure: 'This Place is no longer in the list. Tell the User.' }
    : { value: { id: place.id, name: place.name } };
}

async function eventOf(
  globalEventId: string,
  context: ToolContext,
  globalEvents: GlobalEventsService,
): Promise<Checked<PublishedGlobalEventDto>> {
  if (
    !accepted(context, 'globalEvent', globalEventId, context.shown?.globalEvent ? [context.shown.globalEvent.id] : [])
  ) {
    return { failure: UNRETURNED };
  }
  const [event] = await globalEvents.publishedAmong([globalEventId]);
  return event === undefined || event.startsAt === null
    ? { failure: 'This event is no longer published. Tell the User.' }
    : { value: event };
}

// The Friends to invite, each once, in the order of the User's list.
async function inviteesOf(
  inviteeIds: readonly string[],
  context: ToolContext,
  friends: FriendsService,
): Promise<Checked<ProposalFriend[]>> {
  const ids = [...new Set(inviteeIds)];
  const shownFriends = context.shown?.invitees.map(({ id }) => id) ?? [];
  const unreturned = ids.filter((id) => !accepted(context, 'friend', id, shownFriends));
  if (unreturned.length > 0) {
    return { failure: `${UNRETURNED} Ids: ${unreturned.join(', ')}.` };
  }
  const listed = ids.length === 0 ? [] : await friends.listFriends(context.userId);
  const notFriends = ids.filter((id) => !listed.some((friend) => friend.id === id));
  if (notFriends.length > 0) {
    return { failure: `Not a Friend of the User any more: ${notFriends.join(', ')}. Tell the User.` };
  }
  return { value: listed.filter(({ id }) => ids.includes(id)).map(({ id, name }) => ({ id, name })) };
}

async function resolvedOf(
  { placeId, globalEventId, inviteeIds = [] }: Input,
  context: ToolContext,
  { friends, places, globalEvents }: ProposeQuestServices,
): Promise<Resolved> {
  const resolved: Resolved = { place: null, globalEvent: null, invitees: [], failures: {} };
  if (placeId !== undefined) {
    const place = await placeOf(placeId, context, places);
    if ('failure' in place) {
      resolved.failures.placeId = place.failure;
    } else {
      resolved.place = place.value;
    }
  }
  if (globalEventId !== undefined) {
    const event = await eventOf(globalEventId, context, globalEvents);
    if ('failure' in event) {
      resolved.failures.globalEventId = event.failure;
    } else {
      resolved.globalEvent = event.value;
    }
  }
  const invitees = await inviteesOf(inviteeIds, context, friends);
  if ('failure' in invitees) {
    resolved.failures.inviteeIds = invitees.failure;
  } else {
    resolved.invitees = invitees.value;
  }
  return resolved;
}

// When it starts: the time given, else the event's start. A time before the event is a meeting before it, which the
// party form keeps as its `모이기` (withEvent and meetingOf in mobile/src/features/party/making.ts).
function startOf(given: string | undefined, event: PublishedGlobalEventDto | null): string | undefined {
  return given ?? (event === null || event.startsAt === null ? undefined : koreaTime(new Date(event.startsAt)));
}

// A time after the event's start would be no meeting before it.
function afterTheEvent(startsAt: string | undefined, event: PublishedGlobalEventDto | null): FieldFailures {
  if (
    startsAt === undefined ||
    event === null ||
    event.startsAt === null ||
    new Date(startsAt) <= new Date(event.startsAt)
  ) {
    return {};
  }
  return {
    startsAt: `After the event starts at ${koreaTime(new Date(event.startsAt))}. Leave startsAt out to start with the event, or ask the User for a meeting time before it.`,
  };
}

// The form's readiness rules, which the main server does not hold. The app's `isReady`
// (mobile/src/features/party/making.ts) is the same rule; a change to one changes the other.
// - A 공개 파티 (Open or Approval) has a Board and a description.
// - A 비공개 파티 (Closed) has no Board and at least one invited Friend.
function unready(given: Input, startsAt: string | undefined, invitees: number): FieldFailures {
  const { title, description, joinPolicy, board, capacity } = given;
  const failures: FieldFailures = {};
  if ((title ?? '').trim() === '') {
    failures.title = 'Missing. Ask the User, or make a short one from the request.';
  }
  if (joinPolicy === undefined) {
    failures.joinPolicy = 'Missing: open (바로 참여), approval (승인 후 참여) or closed (비공개).';
  }
  // Without a Join Policy, as the form starts: 공개.
  if (joinPolicy === JoinPolicy.closed) {
    if (board !== undefined) {
      failures.board = 'A 비공개 파티 is posted on no Board. Leave it out.';
    }
    if (invitees === 0) {
      failures.inviteeIds = 'Missing: a 비공개 파티 invites at least one Friend. Ask the User whom.';
    }
  } else {
    if ((description ?? '').trim() === '') {
      failures.description = 'Missing: a 공개 파티 needs a recruiting text. Write a short one from the request.';
    }
    if (board === undefined) {
      failures.board = 'Missing: a 공개 파티 is posted on a Board. Ask the User which.';
    }
  }
  if (capacity === undefined) {
    failures.capacity = 'Missing. Ask the User how many people, themselves included.';
  }
  if (startsAt === undefined) {
    failures.startsAt = 'Missing. Ask the User when it starts.';
  }
  return failures;
}

// The main server's own rules for making a Quest (makeQuestSchema), whose messages go to the model as they are, so
// that a limit changed there reaches the Proposal by itself.
function refusedByServer(given: Input, startsAt: string | undefined): FieldFailures {
  const { title, description, joinPolicy, board, capacity } = given;
  const failures: FieldFailures = {};
  const parsed = makeQuestSchema.safeParse({
    title,
    description,
    joinPolicy,
    board,
    capacity,
    subQuest: { title, startsAt },
  });
  for (const { path, message } of parsed.error?.issues ?? []) {
    const [first, second] = path;
    const field = first === 'subQuest' ? (second === 'startsAt' ? 'startsAt' : 'title') : first;
    if (isField(field)) {
      failures[field] ??= message;
    }
  }
  return failures;
}

// The User and the invited Friends must each have a place: the capacity the main server accepted, not a number here.
function overCapacity(capacity: number | undefined, invitees: number): FieldFailures {
  if (capacity === undefined || invitees === 0 || 1 + invitees <= capacity) {
    return {};
  }
  return {
    inviteeIds: `${invitees} Friends and the User do not fit a capacity of ${capacity}. Ask the User to raise the capacity or invite fewer.`,
  };
}

function inThePast(startsAt: string | undefined, now: Date): FieldFailures {
  const at = new Date(startsAt ?? Number.NaN);
  if (Number.isNaN(at.getTime()) || at > now) {
    return {};
  }
  return { startsAt: `In the past: it is ${koreaTime(now)} now. Ask the User for a time ahead.` };
}

// The proposer: it checks a 파티 the User described against the party form's rules, with the Place, the Global Event
// and the Friends the resolvers found, and adds it to the reply as the Proposal card. It makes nothing: the User makes
// the Quest with the card's 만들기. A second Proposal in one reply replaces the first. On a failure it answers what is
// missing or wrong, field by field, and adds nothing.
export function proposeQuest(services: ProposeQuestServices): Tool {
  return defineTool({
    description:
      'Proposes a 파티 (a Quest) the User asked to make or recruit for: 공개 (open or approval, on a Board) or 비공개 (closed, with invited Friends), optionally at a Place and for a Global Event. It is shown under your reply as a card with 만들기, which makes it. Nothing is made until the User presses it. Give only ids the resolvers returned in this message, the one in [Chosen: …], or those in [Proposal shown: …]. To change a Proposal shown before, give its values again with only the change. When it answers "refused", ask the User for the fields it names.',
    input,
    run: async (given, context) => {
      const resolved = await resolvedOf(given, context, services);
      const startsAt = startOf(given.startsAt, resolved.globalEvent);
      const failures: FieldFailures = {
        ...refusedByServer(given, startsAt),
        ...inThePast(startsAt, context.now),
        ...afterTheEvent(startsAt, resolved.globalEvent),
        ...unready(given, startsAt, resolved.invitees.length),
        ...overCapacity(given.capacity, resolved.invitees.length),
        ...resolved.failures,
      };
      const { title, description = '', joinPolicy, board, capacity } = given;
      if (
        Object.keys(failures).length > 0 ||
        title === undefined ||
        joinPolicy === undefined ||
        capacity === undefined ||
        startsAt === undefined
      ) {
        return { result: 'refused', fields: failures };
      }
      const proposal: QuestProposal = {
        title: title.trim(),
        description: description.trim(),
        joinPolicy,
        board: board ?? null,
        capacity,
        startsAt: koreaTime(new Date(startsAt)),
        place: resolved.place,
        globalEvent: resolved.globalEvent,
        invitees: resolved.invitees,
      };
      context.presented.proposal = proposal;
      await recordPlaceChange(context, resolved.place);
      return { result: 'proposed', proposal: proposalForModel(sentProposalOf(proposal)) };
    },
  });
}
