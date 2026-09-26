import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Pool, PoolClient } from "pg";
import Redis from "ioredis";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    connectionTimeoutMillis: 3000,
  });
  readonly redis = new Redis(
    process.env.REDIS_CACHE_URL || "redis://localhost:6379",
    { lazyConnect: true, maxRetriesPerRequest: 1, connectTimeout: 2000 },
  );
  private timer?: NodeJS.Timeout;
  private relaying = false;
  ready = false;
  constructor() {
    this.redis.on("error", () => {});
  }
  async onModuleInit() {
    if (!process.env.DATABASE_URL) return;
    try {
      await this.tx(async (c) => {
        await c.query("SELECT pg_advisory_xact_lock(741902)");
        await c.query(await readFile("migrations/001_initial.sql", "utf8"));
      });
      this.ready = true;
    } catch (e) {
      console.error(
        "Database initialization failed",
        e instanceof Error ? e.message : "unknown",
      );
      throw e;
    }
    this.timer = setInterval(() => void this.relay(), 1000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    await this.pool.end();
    this.redis.disconnect();
  }
  requireReady() {
    if (!this.ready)
      throw new ServiceUnavailableException({
        message: "Database configuration/connection required",
        code: "CONFIGURATION_REQUIRED",
      });
  }
  async tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await this.pool.connect();
    try {
      await c.query("BEGIN");
      const result = await fn(c);
      await c.query("COMMIT");
      return result;
    } catch (e) {
      await c.query("ROLLBACK");
      throw e;
    } finally {
      c.release();
    }
  }
  async hint(
    c: PoolClient,
    type: string,
    entityId: string,
    userIds?: string[],
    version?: number,
    eventRevision?: number,
  ) {
    await c.query(
      "INSERT INTO outbox(id,envelope,event_revision) VALUES($1,$2,$3)",
      [
        randomUUID(),
        {
          id: randomUUID(),
          type,
          entityId,
          version,
          audience: userIds
            ? { kind: "users", userIds: [...new Set(userIds)] }
            : { kind: "public" },
        },
        eventRevision ?? null,
      ],
    );
  }
  async relay() {
    if (!this.ready || this.relaying) return;
    this.relaying = true;
    try {
      await this.tx(async (c) => {
        // Cross-runtime single relay preserves revision ordering; a crash can duplicate hints.
        const lock = await c.query(
          "SELECT pg_try_advisory_xact_lock(741903) AS locked",
        );
        if (!lock.rows[0].locked) return;
        const rows = await c.query(
          "SELECT * FROM outbox WHERE delivered_at IS NULL ORDER BY sequence LIMIT 100 FOR UPDATE",
        );
        for (const row of rows.rows) {
          await deliverOutbox(this.redis, row);
          await c.query(
            "UPDATE outbox SET delivered_at=now() WHERE sequence=$1",
            [row.sequence],
          );
        }
      });
    } catch (e) {
      console.error(
        "Outbox relay pending:",
        e instanceof Error ? e.message : "unknown",
      );
    } finally {
      this.relaying = false;
    }
  }
}
export const INVALIDATE_SCRIPT = `local current=tonumber(redis.call('GET',KEYS[2]) or '0');local incoming=tonumber(ARGV[1]);if incoming>=current then redis.call('SET',KEYS[2],ARGV[1]);redis.call('DEL',KEYS[1]);end;return 1`;
export const CACHE_SCRIPT = `local floor=tonumber(redis.call('GET',KEYS[2]) or '0');if tonumber(ARGV[1])>=floor then redis.call('SET',KEYS[1],ARGV[2],'EX',30);return 1;end;return 0`;
export async function deliverOutbox(
  redis: Pick<Redis, "eval" | "publish">,
  row: any,
) {
  if (row.event_revision != null)
    await redis.eval(
      INVALIDATE_SCRIPT,
      2,
      "prototype:events",
      "prototype:events:revision",
      String(row.event_revision),
    );
  await redis.publish("prototype:domain-events", JSON.stringify(row.envelope));
}
