import { BadRequestException } from "@nestjs/common";
export function bad(message: string): never {
  throw new BadRequestException({ message, code: "INVALID_INPUT" });
}
export function object(value: any): Record<string, any> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    bad("JSON object required");
  return value;
}
export function text(value: any, name: string, max = 500): string {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    bad(`${name} is required (max ${max})`);
  return value.trim();
}
export function uuid(value: any): string {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  )
    bad("Invalid UUID");
  return value;
}
export function bool(value: any): boolean {
  if (typeof value !== "boolean") bad("enabled must be boolean");
  return value;
}
export function time(value: any, name: string): string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d\d-\d\dT/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    bad(`${name} must be ISO date-time`);
  return new Date(value).toISOString();
}
export function dates(b: any) {
  const startsAt = time(b.startsAt, "startsAt"),
    endsAt = time(b.endsAt, "endsAt");
  if (endsAt <= startsAt) bad("endsAt must be after startsAt");
  return { startsAt, endsAt };
}
export function number(
  value: any,
  name: string,
  min: number,
  max: number,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    bad(`${name} must be between ${min} and ${max}`);
  return value;
}
export function capacity(value: any): number {
  const n = number(value, "maxMembers", 2, 20);
  if (!Number.isInteger(n)) bad("maxMembers must be integer");
  return n;
}
export function coords(b: any) {
  if (b.latitude == null && b.longitude == null)
    return { latitude: null, longitude: null };
  return {
    latitude: number(b.latitude, "latitude", -90, 90),
    longitude: number(b.longitude, "longitude", -180, 180),
  };
}
export function eventInput(value: any) {
  const b = object(value);
  const status = b.status ?? "draft";
  if (!["draft", "published", "cancelled"].includes(status))
    bad("Invalid event status");
  if (b.sourceUrl != null) {
    try {
      const u = new URL(b.sourceUrl);
      if (!["https:", "http:"].includes(u.protocol)) bad("Invalid source URL");
    } catch {
      bad("Invalid source URL");
    }
  }
  return {
    title: text(b.title, "title", 200),
    description:
      typeof b.description === "string" ? b.description.slice(0, 10000) : "",
    ...dates(b),
    locationName: text(b.locationName, "locationName", 300),
    ...coords(b),
    status,
    sourceUrl: b.sourceUrl ?? null,
  };
}
