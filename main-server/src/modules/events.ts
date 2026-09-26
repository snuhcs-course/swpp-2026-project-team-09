import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Database, CACHE_SCRIPT } from "./database";
import { eventInput, uuid, object, text, bad } from "./validation";
export function eventView(r: any) {
  return {
    id: r.id,
    title: r.title,
    description: r.description,
    startsAt: r.starts_at.toISOString(),
    endsAt: r.ends_at.toISOString(),
    locationName: r.location_name,
    latitude: r.latitude,
    longitude: r.longitude,
    status: r.status,
    sourceUrl: r.source_url,
    source: r.source,
    version: r.version,
    updatedAt: r.updated_at.toISOString(),
  };
}
@Injectable()
export class EventsService {
  constructor(private db: Database) {}
  async list(admin = false) {
    this.db.requireReady();
    if (!admin) {
      try {
        const cached = await this.db.redis.get("prototype:events");
        if (cached) return JSON.parse(cached);
      } catch {}
    }
    const snapshot = await this.db.tx(async (c) => {
      const rows = await c.event.findMany({
        where: admin ? {} : { status: { in: ["published", "cancelled"] } },
        orderBy: { starts_at: "asc" },
        take: 500,
      });
      const rev = await c.eventRevision.findUniqueOrThrow({ where: { id: 1 } });
      return { items: rows.map(eventView), revision: Number(rev.revision) };
    }, "RepeatableRead");
    if (!admin) {
      try {
        await this.db.redis.eval(
          CACHE_SCRIPT,
          2,
          "prototype:events",
          "prototype:events:revision",
          String(snapshot.revision),
          JSON.stringify(snapshot),
        );
      } catch {}
    }
    return admin ? { items: snapshot.items } : snapshot;
  }
  async save(body: any, id?: string) {
    this.db.requireReady();
    if (id) uuid(id);
    return this.db.tx(async (c) => {
      const old = id
        ? (
            await c.$queryRaw<
              any[]
            >`SELECT * FROM events WHERE id=${id}::uuid FOR UPDATE`
          )[0]
        : null;
      if (id && !old) throw new NotFoundException("Event not found");
      const input = eventInput({
        ...(old ? eventView(old) : {}),
        ...object(body),
      });
      const eventId = id || randomUUID();
      const data = eventData(input);
      const row = old
        ? await c.event.update({
            where: { id: eventId },
            data: {
              ...data,
              version: { increment: 1 },
              updated_at: new Date(),
            },
          })
        : await c.event.create({ data: { id: eventId, ...data } });
      const rev = Number(
        (
          await c.eventRevision.update({
            where: { id: 1 },
            data: { revision: { increment: 1 } },
          })
        ).revision,
      );
      // Transition back to draft must invalidate existing public snapshots without disclosing draft contents.
      if (input.status !== "draft" || (old?.status !== "draft" && old))
        await this.db.hint(
          c,
          "event.changed",
          eventId,
          undefined,
          row.version,
          rev,
        );
      else
        await this.db.hint(c, "event.changed", eventId, [], row.version, rev);
      return eventView(row);
    });
  }
  async import(body: any) {
    const items = object(body).items;
    if (!Array.isArray(items) || items.length > 100)
      bad("items must be an array of at most 100");
    this.db.requireReady();
    const diagnostics: string[] = [];
    let imported = 0;
    for (const [index, item] of items.entries()) {
      let input: ReturnType<typeof eventInput>, externalId: string;
      try {
        externalId = text(item.externalId, "externalId", 300);
        input = eventInput({ ...item, status: "published" });
      } catch (e) {
        diagnostics.push(
          `Item ${index}: ${e instanceof Error ? e.message : "invalid event"}`,
        );
        continue;
      }
      await this.db.tx(async (c) => {
        const data = eventData(input);
        // Preserve source-import behavior: updates keep an administrator's current status.
        const { status, ...updates } = data;
        const row = await c.event.upsert({
          where: {
            source_external_id: { source: "snu", external_id: externalId },
          },
          create: {
            id: randomUUID(),
            ...data,
            source: "snu",
            external_id: externalId,
          },
          update: {
            ...updates,
            version: { increment: 1 },
            updated_at: new Date(),
          },
        });
        const rev = Number(
          (
            await c.eventRevision.update({
              where: { id: 1 },
              data: { revision: { increment: 1 } },
            })
          ).revision,
        );
        await this.db.hint(
          c,
          "event.changed",
          row.id,
          undefined,
          row.version,
          rev,
        );
      });
      imported++;
    }
    return { imported, skipped: diagnostics.length, diagnostics };
  }
}

function eventData(input: ReturnType<typeof eventInput>) {
  return {
    title: input.title,
    description: input.description,
    starts_at: new Date(input.startsAt),
    ends_at: new Date(input.endsAt),
    location_name: input.locationName,
    latitude: input.latitude,
    longitude: input.longitude,
    status: input.status,
    source_url: input.sourceUrl,
  };
}
