/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import {
  GlobalEvent,
  GlobalEventState,
  type Judgement,
  type JudgementOutcome,
  type Prisma,
  type PublicationRoute,
  SessionAttachment,
  type Source,
} from '../../generated/prisma/client.js';
import { type JudgedSession, storedSessions } from '../judgement-answer.js';

// With what the DTOs read of the post the event was made from: its own session's. One made by an Administrator has none.
export const WITH_OWN_POST = {
  sessions: {
    where: { attachedBy: SessionAttachment.own },
    orderBy: { number: 'asc' },
    take: 1,
    select: { sourcePost: { select: { source: true, key: true, address: true } } },
  },
} satisfies Prisma.GlobalEventInclude;

export type GlobalEventWithOwnPost = Prisma.GlobalEventGetPayload<{ include: typeof WITH_OWN_POST }>;

function ownPost({ sessions }: GlobalEventWithOwnPost): { source: Source; key: string; address: string } | null {
  return sessions.at(0)?.sourcePost ?? null;
}

// A published Global Event as a User's app reads it. How it was published, the flag for Administrators and its links
// to Source Posts stay out: only the address of its own post, which its card opens.
export interface PublishedGlobalEventDto {
  id: string;
  title: string;
  description: string;
  startsAt: string | null;
  endsAt: string | null;
  place: string | null;
  latitude: number | null;
  longitude: number | null;
  sourceUrl: string | null;
}

export function toPublishedGlobalEventDto(event: GlobalEventWithOwnPost): PublishedGlobalEventDto {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt?.toISOString() ?? null,
    endsAt: event.endsAt?.toISOString() ?? null,
    place: event.place,
    latitude: event.latitude,
    longitude: event.longitude,
    sourceUrl: ownPost(event)?.address ?? null,
  };
}

// The states an Administrator lists.
export const listedStateSchema = z.enum([GlobalEventState.draft, GlobalEventState.published]);

export type ListedState = z.infer<typeof listedStateSchema>;

// What publishing a Draft still needs, in this order. A title is never empty.
export type Missing = 'startsAt' | 'position';

// An entry of an Administrator's lists.
export interface ListedGlobalEventDto {
  id: string;
  title: string;
  startsAt: string | null;
  endsAt: string | null;
  place: string | null;
  latitude: number | null;
  longitude: number | null;
  state: GlobalEventState;
  version: number;
  // The post the event was made from, on its Source.
  source: Source | null;
  postKey: string | null;
  sourceUrl: string | null;
  publicationRoute: PublicationRoute | null;
  needsAdministrator: boolean;
  missing: Missing[];
}

export function missingFor({ startsAt, latitude, longitude }: GlobalEvent): Missing[] {
  return [
    ...(startsAt === null ? ['startsAt' as const] : []),
    ...(latitude === null || longitude === null ? ['position' as const] : []),
  ];
}

export function toListedGlobalEventDto(event: GlobalEventWithOwnPost): ListedGlobalEventDto {
  const post = ownPost(event);
  return {
    id: event.id,
    title: event.title,
    startsAt: event.startsAt?.toISOString() ?? null,
    endsAt: event.endsAt?.toISOString() ?? null,
    place: event.place,
    latitude: event.latitude,
    longitude: event.longitude,
    state: event.state,
    version: event.version,
    source: post?.source ?? null,
    postKey: post?.key ?? null,
    sourceUrl: post?.address ?? null,
    publicationRoute: event.publicationRoute,
    needsAdministrator: event.needsAdministrator,
    missing: event.state === GlobalEventState.draft ? missingFor(event) : [],
  };
}

// What an event's page reads beyond the lists: its own post's Judgement.
export const WITH_OWN_POST_AND_JUDGEMENT = {
  sessions: {
    ...WITH_OWN_POST.sessions,
    select: { sourcePost: { select: { source: true, key: true, address: true, judgement: true } } },
  },
} satisfies Prisma.GlobalEventInclude;

export type GlobalEventWithJudgement = Prisma.GlobalEventGetPayload<{ include: typeof WITH_OWN_POST_AND_JUDGEMENT }>;

// The Judgement of an event's post, as an Administrator reads it. One post's Judgement covers all its sessions, and a
// session's `globalEventId` says which event it was published as or attached to. `outcome` is `no_event` for a post called no event,
// `failed` for a Judgement that could not be made, and empty while a try runs.
export interface JudgementDto {
  outcome: JudgementOutcome | null;
  failure: string | null;
  attempts: number;
  announcesEvent: boolean | null;
  sessions: JudgedSession[];
  modelId: string | null;
  judgedAt: string | null;
}

function toJudgementDto(judgement: Judgement): JudgementDto {
  return {
    outcome: judgement.outcome,
    failure: judgement.failure,
    attempts: judgement.attempts,
    announcesEvent: judgement.announcesEvent,
    sessions: storedSessions(judgement.sessions),
    modelId: judgement.modelId,
    judgedAt: judgement.judgedAt?.toISOString() ?? null,
  };
}

// One event as an Administrator reads it, with the text to check against its Source.
export interface GlobalEventDetailDto extends ListedGlobalEventDto {
  description: string;
  judgement: JudgementDto | null;
}

export function toGlobalEventDetailDto(event: GlobalEventWithJudgement): GlobalEventDetailDto {
  const judgement = event.sessions.at(0)?.sourcePost.judgement ?? null;
  return {
    ...toListedGlobalEventDto(event),
    description: event.description,
    judgement: judgement === null ? null : toJudgementDto(judgement),
  };
}
