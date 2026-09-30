import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { Prisma, User } from '../generated/prisma/client.js';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto.js';
import { OnboardingDto } from './dto/onboarding.dto.js';
import { departmentSchema, nameSchema, UpdateProfileDto } from './dto/update-profile.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // A User is identified by the Google subject identifier. The email address and the Google name follow the ones Google
  // sends.
  findOrCreate(account: { googleSubject: string; email: string; googleName: string }): Promise<User> {
    const { googleSubject, email, googleName } = account;
    return this.prisma.user.upsert({
      where: { googleSubject },
      create: { googleSubject, email, googleName },
      update: { email, googleName },
    });
  }

  // An SNU account's Google name reads "홍길동 / 학생 / 컴퓨터공학부". A part the profile would refuse is left out.
  onboardingOf({ onboardedAt, googleName }: User): OnboardingDto {
    if (onboardedAt !== null) {
      return { completed: true };
    }
    const [name, , department] = googleName.split('/');
    return {
      completed: false,
      suggestion: {
        name: nameSchema.safeParse(name).data ?? null,
        department: departmentSchema.safeParse(department).data ?? null,
      },
    };
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
