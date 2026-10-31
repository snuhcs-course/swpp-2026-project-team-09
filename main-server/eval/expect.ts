/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
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
    kind: z.enum(['quest', 'globalEvent', 'restaurant']),
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

// A time of day in Korea; 24:00 is the end of the day.
const clockSchema = z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/u, 'Expected HH:MM');

const intervalSchema = z.strictObject({ start: clockSchema, end: clockSchema });

const modeSchema = z.enum(['walk', 'shuttle']);

// What a 공강 tool must answer, read by normaliseResult (eval/normalise.ts): for the judgement suite, which calls the
// tool with `args`, written as `expect.args` is, whatever the model passes. A run never checks it.
const called = { args: z.record(z.string(), z.unknown()) };

const needsSchema = z.strictObject({
  ...called,
  result: z.literal('needs'),
  needs: z.strictObject({ side: z.enum(['before', 'after']), item: z.string().min(1) }),
});

const candidateSchema = z.strictObject({
  kind: z.enum(['quest', 'globalEvent']),
  seed: seedName,
  start: clockSchema,
  end: clockSchema.nullable(),
  // None when no item comes before the gap.
  travel: z.strictObject({ mode: modeSchema, minutes: z.int().min(0) }).nullable(),
  // After a candidate with an end of at most 3 hours, the way to the next item.
  next: z.strictObject({ minutes: z.int().min(0), isClass: z.boolean() }).optional(),
  // After one with no end or longer than 3 hours.
  leaveBy: clockSchema.optional(),
  endUnknown: z.boolean().optional(),
});

const gapSchema = intervalSchema.extend({ before: z.string().min(1).nullable(), after: z.string().min(1).nullable() });

const personSchema = z.strictObject({
  // 나 for the User.
  name: z.string().min(1),
  mode: modeSchema.nullable(),
  minutes: z.int().min(0).nullable(),
  longest: z.boolean(),
});

const restaurantSchema = z.strictObject({
  seed: seedName,
  start: clockSchema,
  eatingMinutes: z.int().min(0),
  people: z.array(personSchema).min(1),
});

const resultsSchema = z.strictObject({
  getMyDay: z
    .strictObject({
      ...called,
      result: z.literal('found'),
      items: z.array(intervalSchema.extend({ seed: seedName })),
    })
    .optional(),
  findFreeTimeEvents: z
    .union([
      z.strictObject({
        ...called,
        result: z.literal('found'),
        gaps: z.array(gapSchema),
        // Every candidate that fits, soonest first.
        candidates: z.array(candidateSchema),
      }),
      needsSchema,
    ])
    .optional(),
  findFreeFriends: z
    .strictObject({
      ...called,
      result: z.literal('found'),
      freeTime: z.array(intervalSchema),
      friends: z.array(z.strictObject({ seed: seedName, overlap: z.array(intervalSchema) })),
      // With Friends named, the time they all share with the User.
      shared: z.array(intervalSchema).optional(),
    })
    .optional(),
  findMealRestaurants: z
    .union([
      z.strictObject({
        ...called,
        result: z.literal('found'),
        shared: z.array(intervalSchema),
        // The Restaurants that fit, in order.
        restaurants: z.array(restaurantSchema),
      }),
      z.strictObject({ ...called, result: z.literal('none'), why: z.enum(['no-menu', 'no-shared-time']) }),
      needsSchema,
    ])
    .optional(),
});

// What the reply's text must hold, each a word or a list of which any one counts, and the words it must not hold, such
// as the names of Friends who are not free.
const textSchema = z
  .strictObject({
    mentions: z.array(mentionSchema).min(1).optional(),
    absent: z.array(z.string().min(1)).min(1).optional(),
  })
  .refine(({ mentions, absent }) => mentions !== undefined || absent !== undefined, {
    message: 'Give mentions, absent or both',
  });

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
    text: textSchema.optional(),
    results: resultsSchema.optional(),
    // Why the Assistant does not do this yet: scored as usual, reported apart. It may also be given on the case.
    knownFailure: z.string().min(1).optional(),
  })
  .refine(
    ({ actions, text }) => !actions.some((action) => action.includes('ASK')) || text?.mentions !== undefined,
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
