/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { z } from 'zod';

// Kakao's statuses for a walking route it did not find.
export const NO_ROUTE_STATUSES = [
  'SAME_POINT',
  'START_LINK_NOT_FOUND',
  'END_LINK_NOT_FOUND',
  'TOO_MANY_SEARCH_LINK',
  'TOO_FAR_AWAY',
  'ROUTE_RESULT_NOT_FOUND',
] as const;

export type NoRouteStatus = (typeof NO_ROUTE_STATUSES)[number];

// Kakao writes a point as [x, y]: the longitude, then the latitude.
const kakaoPointSchema = z.tuple([z.number(), z.number()]);

const kakaoRouteSchema = z.object({
  properties: z.object({ totalDistance: z.number(), totalTime: z.number() }),
  legs: z.array(z.object({ steps: z.array(z.object({ path: z.object({ points: z.array(kakaoPointSchema) }) })) })),
});

export type KakaoRoute = z.infer<typeof kakaoRouteSchema>;

// The other statuses come with an empty route, which is not read.
export const kakaoWalkAnswerSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('OK'), route: kakaoRouteSchema }),
  z.object({ status: z.enum(NO_ROUTE_STATUSES) }),
]);

export type KakaoWalkAnswer = z.infer<typeof kakaoWalkAnswerSchema>;

// Of an answer that is not read, the log keeps these alone: a route must not be kept, nor the points a User asked for.
export const kakaoCodesSchema = z.object({ status: z.string(), code: z.number() }).partial();
