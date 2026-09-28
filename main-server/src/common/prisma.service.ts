import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client.js';
import { Settings } from './settings.js';

// The main database. Inject it wherever a feature reads or writes records. It connects on the first query.
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(settings: ConfigService<Settings, true>) {
    super({ adapter: new PrismaPg({ connectionString: settings.get('DATABASE_URL', { infer: true }) }) });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
