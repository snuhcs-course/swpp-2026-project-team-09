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
      await c.query("SET TRANSACTION ISOLATION LEVEL REPEATABLE READ");
      const rows = await c.query(
        `SELECT * FROM events ${admin ? "" : "WHERE status IN ('published','cancelled')"} ORDER BY starts_at LIMIT 500`,
      );
      const rev = await c.query(
        "SELECT revision FROM event_revision WHERE id=1",
      );
      return {
        items: rows.rows.map(eventView),
        revision: Number(rev.rows[0].revision),
      };
    });
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
        ? (await c.query("SELECT * FROM events WHERE id=$1 FOR UPDATE", [id]))
            .rows[0]
        : null;
      if (id && !old) throw new NotFoundException("Event not found");
      const input = eventInput({
        ...(old ? eventView(old) : {}),
        ...object(body),
      });
      const eventId = id || randomUUID();
      const values = [
        eventId,
        input.title,
        input.description,
        input.startsAt,
        input.endsAt,
        input.locationName,
        input.latitude,
        input.longitude,
        input.status,
        input.sourceUrl,
      ];
      const r = await c.query(
        `INSERT INTO events(id,title,description,starts_at,ends_at,location_name,latitude,longitude,status,source_url) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(id) DO UPDATE SET title=$2,description=$3,starts_at=$4,ends_at=$5,location_name=$6,latitude=$7,longitude=$8,status=$9,source_url=$10,version=events.version+1,updated_at=now() RETURNING *`,
        values,
      );
      const rev = Number(
        (
          await c.query(
            "UPDATE event_revision SET revision=revision+1 WHERE id=1 RETURNING revision",
          )
        ).rows[0].revision,
      );
      // Transition back to draft must invalidate existing public snapshots without disclosing draft contents.
      if (input.status !== "draft" || (old?.status !== "draft" && old))
        await this.db.hint(
          c,
          "event.changed",
          eventId,
          undefined,
          r.rows[0].version,
          rev,
        );
      else
        await c.query(
          "INSERT INTO outbox(id,envelope,event_revision) VALUES($1,$2,$3)",
          [
            randomUUID(),
            {
              id: randomUUID(),
              type: "event.changed",
              audience: { kind: "users", userIds: [] },
            },
            rev,
          ],
        );
      return eventView(r.rows[0]);
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
        const r = await c.query(
          `INSERT INTO events(id,title,description,starts_at,ends_at,location_name,latitude,longitude,status,source_url,source,external_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'published',$9,'snu',$10) ON CONFLICT(source,external_id) DO UPDATE SET title=excluded.title,description=excluded.description,starts_at=excluded.starts_at,ends_at=excluded.ends_at,location_name=excluded.location_name,latitude=excluded.latitude,longitude=excluded.longitude,source_url=excluded.source_url,version=events.version+1,updated_at=now() RETURNING *`,
          [
            randomUUID(),
            input.title,
            input.description,
            input.startsAt,
            input.endsAt,
            input.locationName,
            input.latitude,
            input.longitude,
            input.sourceUrl,
            externalId,
          ],
        );
        const rev = Number(
          (
            await c.query(
              "UPDATE event_revision SET revision=revision+1 WHERE id=1 RETURNING revision",
            )
          ).rows[0].revision,
        );
        await this.db.hint(
          c,
          "event.changed",
          r.rows[0].id,
          undefined,
          r.rows[0].version,
          rev,
        );
      });
      imported++;
    }
    return { imported, skipped: diagnostics.length, diagnostics };
  }
}
