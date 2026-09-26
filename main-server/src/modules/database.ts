import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../generated/prisma/client";
import Redis from "ioredis";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
export type Transaction = Prisma.TransactionClient;

@Injectable()
export class Database implements OnModuleInit, OnModuleDestroy {
  readonly prisma = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      connectionTimeoutMillis: 3000,
    }),
  });
  readonly redis = new Redis(
    process.env.REDIS_CACHE_URL || "redis://localhost:6379",
    {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    },
  );
  private timer?: NodeJS.Timeout;
  private relayTask?: Promise<void>;
  ready = false;
  constructor() {
    this.redis.on("error", () => {});
  }
  async onModuleInit() {
    if (!process.env.DATABASE_URL) return;
    // Migrate serializes concurrent public/admin deployments using its advisory lock.
    // Existing non-Prisma databases must be explicitly verified and baselined first.
    try {
      await promisify(execFile)(
        process.execPath,
        [
          require.resolve("prisma/build/index.js"),
          "migrate",
          "deploy",
          "--config",
          "prisma.config.ts",
        ],
        { timeout: 120000 },
      );
      await this.prisma.$connect();
      this.ready = true;
    } catch (e) {
      console.error(
        "Database migration/connection failed; verify migration status and baseline before retrying",
      );
      throw e;
    }
    this.timer = setInterval(() => void this.relay(), 1000);
    this.timer.unref();
  }
  async onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
    this.ready = false;
    await this.relayTask;
    await this.prisma.$disconnect();
    this.redis.disconnect();
  }
  requireReady() {
    if (!this.ready)
      throw new ServiceUnavailableException({
        message: "Database configuration/connection required",
        code: "CONFIGURATION_REQUIRED",
      });
  }
  async tx<T>(
    fn: (c: Transaction) => Promise<T>,
    isolationLevel?: Prisma.TransactionIsolationLevel,
  ): Promise<T> {
    return this.prisma.$transaction(fn, {
      maxWait: 5000,
      timeout: 20000,
      isolationLevel,
    });
  }
  async hint(
    c: Transaction,
    type: string,
    entityId: string,
    userIds?: string[],
    version?: number,
    eventRevision?: number,
  ) {
    await c.outbox.create({
      data: {
        id: randomUUID(),
        event_revision: eventRevision ?? null,
        envelope: {
          id: randomUUID(),
          type,
          entityId,
          ...(version === undefined ? {} : { version }),
          audience: userIds
            ? { kind: "users", userIds: [...new Set(userIds)] }
            : { kind: "public" },
        },
      },
    });
  }
  relay(): Promise<void> {
    if (!this.ready) return Promise.resolve();
    if (!this.relayTask)
      this.relayTask = this.relayOnce().finally(() => {
        this.relayTask = undefined;
      });
    return this.relayTask;
  }
  private async relayOnce() {
    try {
      await this.tx(async (c) => {
        const [lock] = await c.$queryRaw<
          { locked: boolean }[]
        >`SELECT pg_try_advisory_xact_lock(741903) AS locked`;
        if (!lock.locked) return;
        const rows = await c.outbox.findMany({
          where: { delivered_at: null },
          orderBy: { sequence: "asc" },
          take: 100,
        });
        for (const row of rows) {
          await deliverOutbox(this.redis, row);
          await c.outbox.update({
            where: { sequence: row.sequence },
            data: { delivered_at: new Date() },
          });
        }
      });
    } catch (e) {
      console.error(
        "Outbox relay pending:",
        e instanceof Error ? e.message : "unknown",
      );
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
