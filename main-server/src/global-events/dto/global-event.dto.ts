/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import {
  GlobalEvent,
  GlobalEventState,
  type Prisma,
  type PublicationRoute,
  SessionAttachment,
  type Source,
} from '../../generated/prisma/client.js';

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

// One event as an Administrator reads it, with the text to check against its Source.
export interface GlobalEventDetailDto extends ListedGlobalEventDto {
  description: string;
}

export function toGlobalEventDetailDto(event: GlobalEventWithOwnPost): GlobalEventDetailDto {
  return { ...toListedGlobalEventDto(event), description: event.description };
}
