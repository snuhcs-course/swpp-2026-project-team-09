/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { JoinPolicy, QuestBoard } from '../../generated/prisma/client.js';
import { makeQuestSchema } from '../../quests/dto/quest-requests.dto.js';
import { defineTool, type Tool } from '../feature.js';
import { koreaTime } from '../korea-time.js';
import { type QuestProposal } from '../proposal.js';

// Every field may be left out, so that the tool, not the model library, says which are missing.
const input = z.object({
  title: z.string().optional().describe('The 파티 title, short, as its post shows it.'),
  description: z
    .string()
    .optional()
    .describe("The recruiting post's text. When the User gave none, write a short one from their request."),
  joinPolicy: z
    .enum([JoinPolicy.open, JoinPolicy.approval])
    .optional()
    .describe(
      'open (바로 참여): anyone joins at once; approval (승인 후 참여): the User approves each. Both are 공개.',
    ),
  board: z
    .enum(QuestBoard)
    .optional()
    .describe('The Board the post goes on: meal 식사, career 진로, hobby 취미 (운동 too), show 공연.'),
  capacity: z.number().optional().describe('How many people the 파티 holds, the User included.'),
  startsAt: z
    .string()
    .optional()
    .describe('When it starts, as an ISO date and time with its offset, such as 2027-01-05T12:00:00+09:00.'),
});

type Input = z.output<typeof input>;

// What is missing or wrong, by field, worded for the model to ask the User.
type FieldFailures = Partial<Record<keyof Input, string>>;

function isField(name: unknown): name is keyof Input {
  return typeof name === 'string' && Object.hasOwn(input.shape, name);
}

// The form's readiness rule for a 공개 파티, which the main server does not hold: it has a Board and a description.
// The app's `isReady` (mobile/src/features/party/making.ts) is the same rule; a change to one changes the other.
function unready({ title, description, joinPolicy, board, capacity, startsAt }: Input): FieldFailures {
  const failures: FieldFailures = {};
  if ((title ?? '').trim() === '') {
    failures.title = 'Missing. Ask the User, or make a short one from the request.';
  }
  if ((description ?? '').trim() === '') {
    failures.description = 'Missing: a 공개 파티 needs a recruiting text. Write a short one from the request.';
  }
  if (joinPolicy === undefined) {
    failures.joinPolicy = 'Missing: open (바로 참여) or approval (승인 후 참여).';
  }
  if (board === undefined) {
    failures.board = 'Missing: a 공개 파티 is posted on a Board. Ask the User which.';
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
function refusedByServer({ title, description, joinPolicy, board, capacity, startsAt }: Input): FieldFailures {
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

function inThePast(startsAt: string | undefined, now: Date): FieldFailures {
  const at = new Date(startsAt ?? Number.NaN);
  if (Number.isNaN(at.getTime()) || at > now) {
    return {};
  }
  return { startsAt: `In the past: it is ${koreaTime(now)} now. Ask the User for a time ahead.` };
}

// The proposer: it checks a 공개 파티 the User described against the party form's rules, and adds it to the reply as
// the Proposal card. It makes nothing: the User makes the Quest with the card's 만들기. A second Proposal in one reply
// replaces the first. On a failure it answers what is missing or wrong, field by field, and adds nothing.
export function proposeQuest(): Tool {
  return defineTool({
    description:
      'Proposes a 공개 파티 (an Open or Approval Quest) the User asked to make or recruit for, shown under your reply as a card with 만들기, which makes it. Nothing is made until the User presses it. To change a Proposal shown before, give its values again with only the change. When it answers "refused", ask the User for the fields it names.',
    input,
    run: (given, { now, presented }) => {
      const failures = { ...refusedByServer(given), ...inThePast(given.startsAt, now), ...unready(given) };
      const { title, description, joinPolicy, board, capacity, startsAt } = given;
      if (
        Object.keys(failures).length > 0 ||
        title === undefined ||
        description === undefined ||
        joinPolicy === undefined ||
        board === undefined ||
        capacity === undefined ||
        startsAt === undefined
      ) {
        return Promise.resolve({ result: 'refused', fields: failures });
      }
      const proposal: QuestProposal = {
        title: title.trim(),
        description: description.trim(),
        joinPolicy,
        board,
        capacity,
        startsAt: koreaTime(new Date(startsAt)),
      };
      presented.proposal = proposal;
      return Promise.resolve({ result: 'proposed', proposal });
    },
  });
}
