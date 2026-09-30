import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { Prisma, User } from '../generated/prisma/client.js';
import { nameSchema, type UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // A User is identified by the Google subject identifier. The email address follows the one Google sends. The
  // profile's name starts as the Google account's, if the profile accepts it.
  findOrCreate(account: { googleSubject: string; email: string; name: string | undefined }): Promise<User> {
    const { googleSubject, email } = account;
    return this.prisma.user.upsert({
      where: { googleSubject },
      create: { googleSubject, email, name: nameSchema.safeParse(account.name).data ?? null },
      update: { email },
    });
  }

  findById(id: string): Promise<User> {
    return this.prisma.user.findUniqueOrThrow({ where: { id } });
  }

  updateProfile(id: string, profile: UpdateProfileDto): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: profile });
  }

  // Locks the User's row until the transaction ends. Another transaction that locks it waits until then. This is the
  // lock an UPDATE of the row takes, so storing a row that refers to the User does not wait for it. A sign-in, a
  // refresh and a sign-out take it first, so that they run one after another for one User.
  async lock(id: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT 1 FROM users WHERE id = ${id}::uuid FOR NO KEY UPDATE`;
  }
}
