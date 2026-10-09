// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #4 #8
import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { Settings } from './settings.js';

// The match database. Inject it wherever a feature reads or writes records.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(settings: ConfigService<Settings, true>) {
    super({
      adapter: new PrismaPg({
        connectionString: settings.get('DATABASE_URL', { infer: true }),
        // pg waits for a new connection without limit by default. Prisma 6 gave up after 5 seconds.
        connectionTimeoutMillis: 5_000,
      }),
    });
  }

  // Startup stops when the database cannot be reached, as it does for Redis.
  // With PrismaPg, $connect() only creates the connection pool, so a query checks that the database answers.
  async onModuleInit(): Promise<void> {
    await this.$queryRaw`SELECT 1`;
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
