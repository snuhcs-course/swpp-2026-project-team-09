import type { Event } from "../api";

export type Coordinate = { latitude: number; longitude: number };

export function validCoordinate(
  value: { latitude: number | null; longitude: number | null } | null,
): value is Coordinate {
  return Boolean(
    value &&
      typeof value.latitude === "number" &&
      Number.isFinite(value.latitude) &&
      Math.abs(value.latitude) <= 90 &&
      typeof value.longitude === "number" &&
      Number.isFinite(value.longitude) &&
      Math.abs(value.longitude) <= 180,
  );
}

export function mapEvents(events: Event[]) {
  return events.filter(
    (event): event is Event & Coordinate =>
      event.status === "published" && validCoordinate(event),
  );
}

// Initial viewport only; this is never presented as a person's location.
export const CAMPUS_CAMERA = {
  latitude: 37.4599,
  longitude: 126.9524,
  zoom: 14.2,
};
