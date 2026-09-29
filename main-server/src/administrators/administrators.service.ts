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

  // A fresh database, a new deployment and the tests all start with the initial Administrators from the settings,
  // without a command run by hand. Once one is registered the list is not read again: Administrators register and
  // remove each other, and the last one cannot be removed.
  async onApplicationBootstrap(): Promise<void> {
    if ((await this.prisma.administrator.count()) > 0) {
      return;
    }
    // Registered by nobody. Two servers starting at the same time both get here, so the second skips the addresses.
    await this.prisma.administrator.createMany({
      data: this.settings.get('INITIAL_ADMINISTRATOR_EMAILS', { infer: true }).map((email) => ({ email })),
      skipDuplicates: true,
    });
  }

  list(): Promise<Administrator[]> {
    return this.prisma.administrator.findMany({ orderBy: [{ registeredAt: 'asc' }, { email: 'asc' }] });
  }

  // Registers an email address as the registrar, or returns the Administrator registered with it already, unchanged.
  async register(email: string, registrarId: string): Promise<Administrator> {
    const registrar = await this.prisma.administrator.findUniqueOrThrow({ where: { id: registrarId } });
    return this.prisma.administrator.upsert({
      where: { email: email.toLowerCase() },
      create: { email: email.toLowerCase(), registeredBy: registrar.email },
      update: {},
    });
  }

  // Removes an Administrator, who may be the one asking. The last one stays, so that someone can still sign in.
  async remove(id: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Locks every Administrator, always in the same order, until the removal commits. Two removals at the same moment
      // then run one after the other, and the second sees what the first left: it keeps the last Administrator, and
      // finds no row for one removed already.
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

  // The Administrator a Google account signs in as, or null when it is not registered. The first sign-in binds the
  // account's subject identifier to the registered email address; later sign-ins are recognised by the identifier.
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

  // Refuses every access token issued to the Administrator until now, in every browser (see AdministratorGuard).
  async endTokens(id: string): Promise<void> {
    await this.prisma.administrator.update({ where: { id }, data: { tokensValidAfter: new Date() } });
  }

  findById(id: string): Promise<Administrator | null> {
    return this.prisma.administrator.findUnique({ where: { id } });
  }
}
