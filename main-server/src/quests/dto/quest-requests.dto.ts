import { z } from 'zod';
import { JoinPolicy, QuestBoard } from '../../generated/prisma/client.js';

const titleSchema = z.string().trim().min(1).max(50);

const capacitySchema = z.int().min(1).max(8);

// The recruiting post. Empty is none.
const descriptionSchema = z.string().trim().max(200);

// Left out, the title is the Global Event's.
export const attendSchema = z.strictObject({ globalEventId: z.uuid(), title: titleSchema.optional() });

export type AttendDto = z.infer<typeof attendSchema>;

export const placeSchema = z.union([
  z.strictObject({ placeId: z.uuid() }),
  // A point on the map, with the label the app showed for it.
  z.strictObject({
    latitude: z.number().min(-90).max(90),
    longitude: z.number().min(-180).max(180),
    label: z.string().trim().min(1).max(50),
  }),
]);

// What a Holder writes when adding or editing a Sub Quest. Left out is the same as null.
export const subQuestContentSchema = z
  .strictObject({
    title: titleSchema,
    startsAt: z.iso.datetime({ offset: true }).nullable().default(null),
    endsAt: z.iso.datetime({ offset: true }).nullable().default(null),
    place: placeSchema.nullable().default(null),
  })
  .refine(({ startsAt, endsAt }) => startsAt === null || endsAt === null || new Date(endsAt) > new Date(startsAt), {
    path: ['endsAt'],
    message: 'The end must be after the start',
  });

export type SubQuestContentDto = z.infer<typeof subQuestContentSchema>;

// A Quest of the User's own, without a Global Event. Left out, the capacity is 4, the Join Policy Closed and the
// description empty. An Open or an Approval Quest is posted on a board, and a Closed one on none.
export const makeQuestSchema = z
  .strictObject({
    title: titleSchema,
    subQuest: subQuestContentSchema,
    capacity: capacitySchema.optional(),
    joinPolicy: z.enum(JoinPolicy).optional(),
    board: z.enum(QuestBoard).optional(),
    description: descriptionSchema.optional(),
  })
  .refine(({ joinPolicy = JoinPolicy.closed, board }) => (board === undefined) === (joinPolicy === JoinPolicy.closed), {
    path: ['board'],
    message: 'An Open or an Approval Quest has a board, and a Closed Quest none',
  });

export type MakeQuestDto = z.infer<typeof makeQuestSchema>;

// The Leader's settings. A field left out stays as it is.
export const updateQuestSchema = z.strictObject({
  title: titleSchema.optional(),
  capacity: capacitySchema.optional(),
  joinPolicy: z.enum(JoinPolicy).optional(),
  board: z.enum(QuestBoard).optional(),
  description: descriptionSchema.optional(),
});

export type UpdateQuestDto = z.infer<typeof updateQuestSchema>;

// A Holder of the Quest, or a Friend of the Leader, by their User id.
export const userIdSchema = z.strictObject({ userId: z.uuid() });

export type UserIdDto = z.infer<typeof userIdSchema>;
