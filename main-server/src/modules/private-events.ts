import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { PrivateEvent } from "../generated/prisma/client";
import { Database } from "./database";
import {
  lockScheduleUsers,
  validateScheduleWindow,
} from "./schedule-conflicts";
import { bad, coords, exactTime, object, text, uuid } from "./validation";

const editable = [
  "title",
  "description",
  "startsAt",
  "endsAt",
  "locationName",
  "latitude",
  "longitude",
];
function fields(b: Record<string, any>, allowed: string[]) {
  if (Object.keys(b).some((key) => !allowed.includes(key)))
    bad("Unknown field");
}
function coordinatesTogether(b: Record<string, any>) {
  if ("latitude" in b !== "longitude" in b)
    bad("latitude and longitude must be supplied together");
}
function emptyText(value: unknown, name: string, max: number) {
  if (typeof value !== "string" || value.length > max)
    bad(`${name} must be text (max ${max})`);
  return value;
}
function version(value: unknown): number {
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < 1 ||
    value > 2147483646
  )
    bad("expectedVersion must be a positive integer");
  return value;
}
export function privateEventInput(value: unknown) {
  const b = object(value);
  fields(b, editable);
  coordinatesTogether(b);
  const starts_at = exactTime(b.startsAt, "startsAt"),
    ends_at = exactTime(b.endsAt, "endsAt");
  if (ends_at <= starts_at) bad("endsAt must follow startsAt");
  validateScheduleWindow(starts_at, ends_at);
  return {
    title: text(b.title, "title", 200),
    description: emptyText(b.description, "description", 5000),
    starts_at,
    ends_at,
    location_name: emptyText(b.locationName, "locationName", 300).trim(),
    ...coords(b),
  };
}
function patchInput(value: unknown) {
  const b = object(value);
  fields(b, ["expectedVersion", ...editable]);
  coordinatesTogether(b);
  const expectedVersion = version(b.expectedVersion);
  const { expectedVersion: _, ...changes } = b;
  if (!Object.keys(changes).length) bad("At least one editable field required");
  return { expectedVersion, changes };
}
function view(row: PrivateEvent) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: row.starts_at.toISOString(),
    endsAt: row.ends_at.toISOString(),
    locationName: row.location_name,
    latitude: row.latitude,
    longitude: row.longitude,
    version: row.version,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}
function conflict(): never {
  throw new ConflictException({
    code: "VERSION_CONFLICT",
    message: "Private event changed; reload before saving",
  });
}
@Injectable()
export class PrivateEventsService {
  constructor(private db: Database) {}
  async list(owner: string) {
    this.db.requireReady();
    const rows = await this.db.prisma.privateEvent.findMany({
      where: { owner_id: owner },
      orderBy: [{ starts_at: "asc" }, { id: "asc" }],
    });
    return { items: rows.map(view) };
  }
  async create(owner: string, body: unknown) {
    const data = privateEventInput(body);
    this.db.requireReady();
    return this.db.tx(async (c) => {
      await lockScheduleUsers(c, [owner]);
      // Personal calendars are source data: overlaps do not silently alter accepted plans.
      const row = await c.privateEvent.create({
        data: { id: randomUUID(), owner_id: owner, ...data },
      });
      await this.db.hint(
        c,
        "private-event.changed",
        row.id,
        [owner],
        row.version,
      );
      return view(row);
    });
  }
  async update(owner: string, id: string, body: unknown) {
    uuid(id);
    const { expectedVersion, changes } = patchInput(body);
    this.db.requireReady();
    return this.db.tx(async (c) => {
      await lockScheduleUsers(c, [owner]);
      const old = await c.privateEvent.findFirst({
        where: { id, owner_id: owner },
      });
      if (!old) throw new NotFoundException("Private event not found");
      if (old.version !== expectedVersion) conflict();
      const data = privateEventInput({
        title: old.title,
        description: old.description,
        startsAt: old.starts_at.toISOString(),
        endsAt: old.ends_at.toISOString(),
        locationName: old.location_name,
        latitude: old.latitude,
        longitude: old.longitude,
        ...changes,
      });
      const rows = await c.privateEvent.updateManyAndReturn({
        where: { id, owner_id: owner, version: expectedVersion },
        data: { ...data, version: { increment: 1 }, updated_at: new Date() },
      });
      if (!rows[0]) conflict();
      await this.db.hint(
        c,
        "private-event.changed",
        id,
        [owner],
        rows[0].version,
      );
      return view(rows[0]);
    });
  }
  async remove(owner: string, id: string, body: unknown) {
    uuid(id);
    const b = object(body);
    fields(b, ["expectedVersion"]);
    const expectedVersion = version(b.expectedVersion);
    this.db.requireReady();
    return this.db.tx(async (c) => {
      await lockScheduleUsers(c, [owner]);
      const old = await c.privateEvent.findFirst({
        where: { id, owner_id: owner },
      });
      if (!old) throw new NotFoundException("Private event not found");
      if (old.version !== expectedVersion) conflict();
      const result = await c.privateEvent.deleteMany({
        where: { id, owner_id: owner, version: expectedVersion },
      });
      if (!result.count) conflict();
      // ID/version-only tombstone causes the owner to reload without publishing removed data.
      await this.db.hint(
        c,
        "private-event.changed",
        id,
        [owner],
        old.version + 1,
      );
      return { ok: true };
    });
  }
}
