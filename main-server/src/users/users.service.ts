/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-09-30  Opus 5.5   prompted by fyoon46
 * 2026-10-01  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Fable 5.1  prompted by fyoon46
 * 2026-10-05  Opus 5.5   prompted by fyoon46
 * 2026-11-19  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service.js';
import { Prisma, User } from '../generated/prisma/client.js';
import { accountFieldsOf, accountProfileOf, googleNameParts } from './account-profile.js';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto.js';
import { OnboardingDto, OnboardingSource } from './dto/onboarding.dto.js';
import { ProfileDto, toProfileDto } from './dto/profile.dto.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { newFriendId } from './friend-id.js';

const FRIEND_ID_ATTEMPTS = 3;

// With the driver adapter, P2002 names the unique index in the adapter's error, not in `meta.target`.
const friendIdHeldSchema = z.object({
  driverAdapterError: z.object({
    cause: z.object({ constraint: z.object({ index: z.literal('users_friend_id_key') }) }),
  }),
});

function isFriendIdHeld(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    friendIdHeldSchema.safeParse(error.meta).success
  );
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // A User is identified by the Google subject identifier. The email address and the Google name follow the ones Google
  // sends. A new User's Friend ID that another User already holds, one of 31^8, is drawn again.
  async findOrCreate(account: { googleSubject: string; email: string; googleName: string }): Promise<User> {
    const user = await this.upsert(account);
    const { googleName } = account;
    // The form is confirmed on an undergraduate's account only, so the log shows the accounts that differ.
    const parts = googleNameParts(googleName).length;
    if (parts !== 3) {
      this.logger.warn(`The Google name of User ${user.id} has ${parts} parts separated by "/", not 3.`);
    }
    return this.followAccount(user);
  }

  // An onboarded User's name and department follow the ones the account gives at every sign-in. Before onboarding they
  // stay empty, and onboarding stores them.
  private followAccount(user: User): Promise<User> {
    if (user.onboardedAt === null) {
      return Promise.resolve(user);
    }
    const given = accountFieldsOf(user.googleName);
    const differs =
      (given.name !== undefined && given.name !== user.name) ||
      (given.department !== undefined && given.department !== user.department);
    return differs ? this.prisma.user.update({ where: { id: user.id }, data: given }) : Promise.resolve(user);
  }

  private async upsert(
    { googleSubject, email, googleName }: { googleSubject: string; email: string; googleName: string },
    attempt = 1,
  ): Promise<User> {
    try {
      return await this.prisma.user.upsert({
        where: { googleSubject },
        create: { googleSubject, email, googleName, friendId: newFriendId() },
        update: { email, googleName },
      });
    } catch (error) {
      if (attempt < FRIEND_ID_ATTEMPTS && isFriendIdHeld(error)) {
        return this.upsert({ googleSubject, email, googleName }, attempt + 1);
      }
      throw error;
    }
  }

  // The suggestion is what the account gives, which onboarding shows fixed. A part it lacks is null, for the User to
  // fill in.
  onboardingOf({ onboardedAt, googleName }: OnboardingSource): OnboardingDto {
    if (onboardedAt !== null) {
      return { completed: true };
    }
    return { completed: false, suggestion: accountProfileOf(googleName) };
  }

  profileOf(user: User): ProfileDto {
    return toProfileDto(user);
  }

  findById(id: string): Promise<User> {
    return this.prisma.user.findUniqueOrThrow({ where: { id } });
  }

  // A name or a department that the account gives is stored over the one sent, so that an older app's edit of it
  // saves the other fields.
  async updateProfile(id: string, profile: UpdateProfileDto): Promise<User> {
    const { googleName } = await this.findById(id);
    return this.prisma.user.update({ where: { id }, data: { ...profile, ...accountFieldsOf(googleName) } });
  }

  // The name and the department come from the account, and the User sends only one it does not give. A repeat keeps
  // the time of the first completion.
  async completeOnboarding(id: string, sent: CompleteOnboardingDto): Promise<void> {
    const { googleName } = await this.findById(id);
    const profile = { ...sent, ...accountFieldsOf(googleName) };
    const missing = (['name', 'department'] as const).filter((field) => profile[field] === undefined);
    if (missing.length > 0) {
      throw new BadRequestException(missing.map((field) => `${field}: Required: the SNU account does not give it`));
    }
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id }, data: profile }),
      this.prisma.user.updateMany({ where: { id, onboardedAt: null }, data: { onboardedAt: new Date() } }),
    ]);
  }

  // Locks the User's row until the transaction ends. Another transaction that locks it waits until then. This is the
  // lock an UPDATE of the row takes, so storing a row that refers to the User does not wait for it. A sign-in, a
  // refresh and a sign-out take it first, so that they run one after another for one User.
  async lock(id: string, tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw`SELECT 1 FROM users WHERE id = ${id}::uuid FOR NO KEY UPDATE`;
  }
}
