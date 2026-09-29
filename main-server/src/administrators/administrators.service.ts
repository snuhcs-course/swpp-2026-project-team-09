import { ConflictException, Injectable, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma.service.js';
import { Settings } from '../common/settings.js';
import { Administrator } from '../generated/prisma/client.js';

@Injectable()
export class AdministratorsService implements OnApplicationBootstrap {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: ConfigService<Settings, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if ((await this.prisma.administrator.count()) > 0) {
      return;
    }
    // Two servers starting together both get here.
    await this.prisma.administrator.createMany({
      data: this.settings.get('INITIAL_ADMINISTRATOR_EMAILS', { infer: true }).map((email) => ({ email })),
      skipDuplicates: true,
    });
  }

  list(): Promise<Administrator[]> {
    return this.prisma.administrator.findMany({ orderBy: { email: 'asc' } });
  }

  register(email: string): Promise<Administrator> {
    return this.prisma.administrator.upsert({
      where: { email: email.toLowerCase() },
      create: { email: email.toLowerCase() },
      update: {},
    });
  }

  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Locks every row in a fixed order, so that two removals at the same moment run one after the other and the
      // second sees what the first left.
      const locked = await tx.$queryRaw<{ id: string }[]>`SELECT id FROM administrators ORDER BY id FOR UPDATE`;
      if (!locked.some((administrator) => administrator.id === id)) {
        throw new NotFoundException('No Administrator has this id.');
      }
      if (locked.length === 1) {
        throw new ConflictException('The last Administrator cannot be removed.');
      }
      await tx.administrator.delete({ where: { id } });
    });
  }

  // The first sign-in binds the Google account to the registered address. Looking up by the subject again also finds a
  // row a concurrent first sign-in bound, and misses one bound to another account.
  async findForSignIn(googleSubject: string, email: string): Promise<Administrator | null> {
    const bound = await this.prisma.administrator.findUnique({ where: { googleSubject } });
    if (bound !== null) {
      return bound;
    }
    await this.prisma.administrator.updateMany({
      where: { email: email.toLowerCase(), googleSubject: null },
      data: { googleSubject },
    });
    return this.prisma.administrator.findUnique({ where: { googleSubject } });
  }

  async endTokens(id: string): Promise<void> {
    await this.prisma.administrator.update({ where: { id }, data: { tokensValidAfter: new Date() } });
  }

  findById(id: string): Promise<Administrator | null> {
    return this.prisma.administrator.findUnique({ where: { id } });
  }
}
