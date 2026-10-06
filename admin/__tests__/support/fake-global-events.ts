import type { GlobalEvent, GlobalEventChange, Missing, Refusal } from '@/main-server';
import type * as MainServerModule from '@/main-server';

// The rules of the main server's Global Events that the fake main server keeps.

const { MainServerError } = await vi.importActual<typeof MainServerModule>('@/main-server');

// A rough box around the Gwanak campus, standing in for the Campus Boundary.
const CAMPUS = { south: 37.44, north: 37.475, west: 126.94, east: 126.965 };

export function refused(status: number, refusal: Refusal): Error {
  return new MainServerError(status, refusal);
}

export const TRANSITIONS = {
  publish: ['draft', 'published'],
  discard: ['draft', 'discarded'],
  cancel: ['published', 'cancelled'],
} as const;

export function missingFor({ startsAt, latitude, longitude }: GlobalEvent): Missing[] {
  return [
    ...(startsAt === null ? ['startsAt' as const] : []),
    ...(latitude === null || longitude === null ? ['position' as const] : []),
  ];
}

// As the main server, `missing` only for a Draft.
export function withMissing(event: GlobalEvent): GlobalEvent {
  return { ...event, missing: event.state === 'draft' ? missingFor(event) : [] };
}

// Starts first, the events without a start last, then by title.
export function byStart(a: GlobalEvent, b: GlobalEvent): number {
  if (a.startsAt !== b.startsAt) {
    if (a.startsAt === null) {
      return 1;
    }
    if (b.startsAt === null) {
      return -1;
    }
    return Date.parse(a.startsAt) - Date.parse(b.startsAt);
  }
  return a.title.localeCompare(b.title);
}

const broken = (message: string): Error => refused(400, { message: [message] });

export function refuseFields({ title, startsAt, endsAt, latitude, longitude }: GlobalEventChange): void {
  if (title.trim() === '') {
    throw broken('title: Too small: expected string to have >=1 characters');
  }
  if (startsAt !== null && endsAt !== null && Date.parse(endsAt) <= Date.parse(startsAt)) {
    throw broken('endsAt: The end must be after the start');
  }
  if ((latitude === null) !== (longitude === null)) {
    throw broken('latitude: The latitude and the longitude are given together');
  }
  if (
    latitude !== null &&
    longitude !== null &&
    (latitude < CAMPUS.south || latitude > CAMPUS.north || longitude < CAMPUS.west || longitude > CAMPUS.east)
  ) {
    throw broken('latitude: The position must be inside the Campus Boundary');
  }
}

export function newEvent(event: Partial<GlobalEvent>): GlobalEvent {
  return withMissing({
    id: crypto.randomUUID(),
    title: 'Event',
    description: '',
    startsAt: null,
    endsAt: null,
    place: null,
    latitude: null,
    longitude: null,
    state: 'draft',
    version: 1,
    postNumber: null,
    sourceUrl: null,
    missing: [],
    ...event,
  });
}
