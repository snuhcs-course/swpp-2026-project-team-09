// AI-generated with Claude Opus 5.5 and Fable 5.1, 2026-09-29 to 2026-10-05, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #5 #9 #18 #23 #38
import { Injectable, Logger } from '@nestjs/common';
import { z } from 'zod';
import { PrismaService } from '../common/prisma.service.js';
import { Prisma, User } from '../generated/prisma/client.js';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto.js';
import { OnboardingDto, OnboardingSource } from './dto/onboarding.dto.js';
import { ProfileDto, toProfileDto } from './dto/profile.dto.js';
import { departmentSchema, nameSchema, UpdateProfileDto } from './dto/update-profile.dto.js';
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

// An SNU account's Google name reads "홍길동 / 학생 / 컴퓨터공학부".
function googleNameParts(googleName: string): string[] {
  return googleName === '' ? [] : googleName.split('/');
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
    return user;
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

  // A part of the Google name that the profile would refuse is left out of the suggestion.
  onboardingOf({ onboardedAt, googleName }: OnboardingSource): OnboardingDto {
    if (onboardedAt !== null) {
      return { completed: true };
    }
    const [name, , department] = googleNameParts(googleName);
    return {
      completed: false,
      suggestion: {
        name: nameSchema.safeParse(name).data ?? null,
        department: departmentSchema.safeParse(department).data ?? null,
      },
    };
  }

  profileOf(user: User): ProfileDto {
    return toProfileDto(user);
  }

  findById(id: string): Promise<User> {
    return this.prisma.user.findUniqueOrThrow({ where: { id } });
  }

  updateProfile(id: string, profile: UpdateProfileDto): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: profile });
  }

  // A repeat keeps the time of the first completion.
  async completeOnboarding(id: string, profile: CompleteOnboardingDto): Promise<void> {
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
