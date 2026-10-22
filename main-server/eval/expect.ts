/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';

// What a scored turn should be (spec P19, "Cases"): the kinds of action accepted, the tools it must, may and must not
// call, their arguments, and the outcome the reply must hold. Values that name something of the fixed world are seed
// names, such as 학생회관 or 이민수; dates and times are compared normalised (eval/normalise.ts).

// The kinds of action a turn takes (spec P19, "Scoring"), and the two combinations.
export const ACTIONS = ['TOOL', 'ASK', 'PROPOSE', 'REFUSE', 'CHAT', 'TOOL+ASK', 'PROPOSE+ASK'] as const;

export type Action = (typeof ACTIONS)[number];

// The single kinds, which the scorecard's action recall is given by.
export const KINDS = ['TOOL', 'ASK', 'PROPOSE', 'REFUSE', 'CHAT'] as const;

export type Kind = (typeof KINDS)[number];

// The kinds an action is made of: TOOL+ASK of TOOL and ASK.
export function kindsOf(action: Action): Kind[] {
  return KINDS.filter((kind) => action.split('+').includes(kind));
}

const seedName = z.string().min(1);

// A word the text must hold, or a list of words of which any one counts: [몇 명, 인원, 몇 분].
const mentionSchema = z.union([z.string().min(1), z.array(z.string().min(1)).min(1)]);

export type Mention = z.infer<typeof mentionSchema>;

// The cards of one kind the reply must show: these seeds among them, and how many in all.
const cardsSchema = z
  .strictObject({
    kind: z.enum(['quest', 'globalEvent']),
    seeds: z.array(seedName).default([]),
    min: z.int().min(0).optional(),
    max: z.int().min(0).optional(),
  })
  .refine(({ min, max }) => min === undefined || max === undefined || min <= max, {
    message: 'min must not be above max',
  });

// The Proposal's fields the reply must hold; those left out are not checked. Its Place, Global Event and invitees by
// seed name, its start as a time in Korea.
const proposalSchema = z.strictObject({
  joinPolicy: z.enum(['open', 'approval', 'closed']).optional(),
  board: z.string().min(1).nullable().optional(),
  capacity: z.int().optional(),
  startsAt: z.string().min(1).optional(),
  place: seedName.nullable().optional(),
  globalEvent: seedName.nullable().optional(),
  invitees: z.array(seedName).optional(),
});

// A tool's expected arguments, compared after normalising: the fields given must match, the others may be anything. A
// list means the tool must have been called once with each.
const argsSchema = z.record(
  z.string(),
  z.union([z.record(z.string(), z.unknown()), z.array(z.record(z.string(), z.unknown())).min(1)]),
);

const toolList = z.array(z.string().min(1));

export const expectSchema = z
  .strictObject({
    actions: z.array(z.enum(ACTIONS)).min(1),
    tools: z
      .strictObject({
        required: toolList.default([]),
        allowed: toolList.default([]),
        // "*": no tool may be called.
        forbidden: z.union([toolList, z.literal('*')]).default([]),
      })
      .default({ required: [], allowed: [], forbidden: [] }),
    args: argsSchema.default({}),
    proposal: proposalSchema.optional(),
    cards: z.array(cardsSchema).optional(),
    // The map layers the reply's buttons show, all and only those.
    mapButtons: z.array(z.enum(['dining', 'shuttle'])).optional(),
    text: z.strictObject({ mentions: z.array(mentionSchema).min(1) }).optional(),
    // Why the Assistant does not do this yet: scored as usual, reported apart. It may also be given on the case.
    knownFailure: z.string().min(1).optional(),
  })
  .refine(
    ({ actions, text }) => !actions.some((action) => action.includes('ASK')) || text !== undefined,
    // ASK is read from the words the text must hold, never from a question mark.
    { message: 'An expectation accepting an ASK names what the question holds in text.mentions', path: ['text'] },
  )
  .refine(
    ({ tools }) =>
      tools.forbidden === '*'
        ? tools.required.length === 0 && tools.allowed.length === 0
        : !tools.forbidden.some((name) => tools.required.includes(name) || tools.allowed.includes(name)),
    { message: 'A tool cannot be both forbidden and required or allowed', path: ['tools'] },
  )
  .refine(({ args, tools }) => Object.keys(args).every((name) => tools.required.includes(name)), {
    message: 'Arguments are expected only of required tools',
    path: ['args'],
  });

export type Expect = z.output<typeof expectSchema>;
