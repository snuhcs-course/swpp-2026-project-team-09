import { z } from 'zod';

// The parts of the main server's answers and of the socket's messages that the flows read (main-server/README.md).
// Parsing an answer checks that it has them.

export const position = z.object({ latitude: z.number(), longitude: z.number() });

export type Position = z.infer<typeof position>;

export const userPosition = position.extend({ userId: z.string() });

export const removedPosition = z.object({ userId: z.string() });

const someone = z.object({ id: z.string() });

export const globalEvent = position.extend({ id: z.string(), state: z.string(), version: z.number() });

export const matchingRequest = z.object({ state: z.string(), questId: z.string().nullable() });

export const quest = z.object({
  id: z.string(),
  title: z.string(),
  globalEvent: someone.nullable(),
  holders: z.array(someone),
});

export const party = z.object({ id: z.string(), members: z.array(someone) });

export const walkingRoute = z.object({ status: z.string(), route: z.object({ line: z.array(position) }).nullable() });

export const inviteLink = z.object({ url: z.string() });

export const meetup = z.object({ id: z.string() });

export const restaurant = z.object({ name: z.string(), meals: z.array(z.object({ meal: z.string() })) });

export const vehicle = z.object({ carId: z.string(), stop: z.object({ name: z.string() }) });
