import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { Prisma, User } from '../generated/prisma/client.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // A User is identified by the Google subject identifier. The email address follows the one Google sends.
  findOrCreate(googleSubject: string, email: string): Promise<User> {
    return this.prisma.user.upsert({ where: { googleSubject }, create: { googleSubject, email }, update: { email } });
  }

  findById(id: string): Promise<User> {
    return this.prisma.user.findUniqueOrThrow({ where: { id } });
  }

  // Locks the User's row until the transaction ends. Another transaction that locks it waits until then. This is the
  // lock an UPDATE of the row takes, so storing a row that refers to the User does not wait for it. Code that changes
  // a User's refresh tokens takes this lock first.
  async lock(id: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT 1 FROM users WHERE id = ${id}::uuid FOR NO KEY UPDATE`;
  }

  async turnOffMasterSwitch(id: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.user.update({ where: { id }, data: { masterSwitch: false } });
  }
}
