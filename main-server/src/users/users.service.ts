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
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { ConflictException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service.js';
import { Prisma, User } from '../generated/prisma/client.js';
import { accountFieldsOf, accountProfileOf, googleNameParts } from './account-profile.js';
import { type StoredConsent, usageMayBeSent } from './consent.js';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto.js';
import { ConsentBodyDto, ConsentDto } from './dto/consent.dto.js';
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

const consentVersionOutdated = (): ConflictException =>
  new ConflictException({
    statusCode: HttpStatus.CONFLICT,
    error: 'Conflict',
    code: 'CONSENT_VERSION_OUTDATED',
    message: 'The account has already agreed to a later version of the documents.',
  });

const consentRequired = (): ConflictException =>
  new ConflictException({
    statusCode: HttpStatus.CONFLICT,
    error: 'Conflict',
    code: 'CONSENT_REQUIRED',
    message: 'Agree to the documents on the consent screen first.',
  });

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

  // The suggestion is what the account gives, which onboarding shows fixed. A part it lacks is null.
  onboardingOf({ onboardedAt, googleName }: OnboardingSource): OnboardingDto {
    if (onboardedAt !== null) {
      return { completed: true };
    }
    return { completed: false, suggestion: accountProfileOf(googleName) };
  }

  profileOf(user: User): ProfileDto {
    return toProfileDto(user);
  }

  consentOf({ consentVersion, usageConsent }: StoredConsent): ConsentDto {
    return { version: consentVersion, usage: usageConsent };
  }

  // A version higher than the account's is stored with the choice; the same version again stores the choice it
  // carries, so that the app may send it again when the answer was lost. A lower one is refused.
  async agree(id: string, { version, usage }: ConsentBodyDto): Promise<void> {
    const now = new Date();
    const agreed = await this.prisma.user.updateMany({
      where: { id, OR: [{ consentVersion: null }, { consentVersion: { lt: version } }] },
      data: { consentVersion: version, usageConsent: usage, consentedAt: now, usageChosenAt: now },
    });
    if (agreed.count > 0) {
      return;
    }
    const repeated = await this.prisma.user.updateMany({
      where: { id, consentVersion: version },
      data: { usageConsent: usage, usageChosenAt: now },
    });
    if (repeated.count === 0) {
      throw consentVersionOutdated();
    }
  }

  // The switch in 내 정보. The version and when it was agreed to stay as they are.
  async chooseUsage(id: string, usage: boolean): Promise<void> {
    const chosen = await this.prisma.user.updateMany({
      where: { id, consentVersion: { not: null } },
      data: { usageConsent: usage, usageChosenAt: new Date() },
    });
    if (chosen.count === 0) {
      throw consentRequired();
    }
  }

  // Whether usage data about the User may be sent, read from the account each time, so that a change of the switch
  // holds from the next event.
  async usageMayBeSent(id: string): Promise<boolean> {
    const consent = await this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: { consentVersion: true, usageConsent: true },
    });
    return usageMayBeSent(consent);
  }

  findById(id: string): Promise<User> {
    return this.prisma.user.findUniqueOrThrow({ where: { id } });
  }

  updateProfile(id: string, profile: UpdateProfileDto): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: profile });
  }

  // The name and the department are stored from the account. Every SNU account is taken to give both; one that does
  // not is logged and completes onboarding with that part empty. A repeat keeps the time of the first completion.
  async completeOnboarding(id: string, sent: CompleteOnboardingDto): Promise<void> {
    const { googleName } = await this.findById(id);
    const account = accountFieldsOf(googleName);
    const missing = (['name', 'department'] as const).filter((field) => account[field] === undefined);
    if (missing.length > 0) {
      this.logger.warn(`User ${id} completes onboarding without a ${missing.join(' or ')} from the SNU account.`);
    }
    const profile = { ...sent, ...account };
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
