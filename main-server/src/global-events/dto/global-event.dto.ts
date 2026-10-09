// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { z } from 'zod';
import { GlobalEvent, GlobalEventState } from '../../generated/prisma/client.js';

// A published Global Event as a User's app reads it.
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

export function toPublishedGlobalEventDto(event: GlobalEvent): PublishedGlobalEventDto {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startsAt: event.startsAt?.toISOString() ?? null,
    endsAt: event.endsAt?.toISOString() ?? null,
    place: event.place,
    latitude: event.latitude,
    longitude: event.longitude,
    sourceUrl: event.sourceUrl,
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
  postNumber: number | null;
  sourceUrl: string | null;
  missing: Missing[];
}

export function missingFor({ startsAt, latitude, longitude }: GlobalEvent): Missing[] {
  return [
    ...(startsAt === null ? ['startsAt' as const] : []),
    ...(latitude === null || longitude === null ? ['position' as const] : []),
  ];
}

export function toListedGlobalEventDto(event: GlobalEvent): ListedGlobalEventDto {
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
    postNumber: event.postNumber,
    sourceUrl: event.sourceUrl,
    missing: event.state === GlobalEventState.draft ? missingFor(event) : [],
  };
}

// One event as an Administrator reads it, with the text to check against its Source.
export interface GlobalEventDetailDto extends ListedGlobalEventDto {
  description: string;
}

export function toGlobalEventDetailDto(event: GlobalEvent): GlobalEventDetailDto {
  return { ...toListedGlobalEventDto(event), description: event.description };
}
