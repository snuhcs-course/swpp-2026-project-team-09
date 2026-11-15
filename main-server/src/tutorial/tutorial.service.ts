/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { BadRequestException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { TutorialCompletion, type User } from '../generated/prisma/client.js';
import { notFound } from '../quests/refusals.js';
import { UsersService } from '../users/users.service.js';
import { TutorialDto } from './dto/tutorial.dto.js';
import { type TutorialContent, type TutorialQuest } from './tutorial-content.js';
import { eligibleByDefault, questStatus, tutorialState } from './tutorial-state.js';

export const TUTORIAL_CONTENT = 'TUTORIAL_CONTENT';

// By the User's admission year and 소속 now, whether or not the tutorial was turned on by it.
function isEligibleByDefault(user: User, at: Date): boolean {
  return eligibleByDefault({ admissionYear: user.admissionYear, affiliation: user.affiliation }, at);
}

// The completions each kind of quest accepts, by the kind it is served as (servedContent). The phone does the 관정 check, so the server records how and does not
// verify it.
const ACCEPTED_BY: Record<TutorialQuest['completion']['kind'], readonly TutorialCompletion[]> = {
  button: [TutorialCompletion.button],
  kwanjeongCheck: [TutorialCompletion.checked, TutorialCompletion.forced, TutorialCompletion.skipped],
};

// Each write below is safe to repeat and to run beside another of the same User's: a row is created if missing, and a
// time is then set by a condition the database checks.
@Injectable()
export class TutorialService {
  private readonly keys: string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    @Inject(TUTORIAL_CONTENT) private readonly content: TutorialContent,
  ) {
    this.keys = content.quests.map(({ key }) => key);
  }

  // For a User eligible by default, the first read that finds the tutorial neither on nor stopped turns it on, so that
  // a later change of the admission year or 소속 does not turn it off.
  async read(userId: string): Promise<TutorialDto> {
    const user = await this.users.findById(userId);
    const now = new Date();
    if (isEligibleByDefault(user, now)) {
      await this.ensureProgress(userId);
      await this.prisma.tutorialProgress.updateMany({
        where: { userId, enabledAt: null, stoppedAt: null },
        data: { enabledAt: now, rowHiddenAt: null },
      });
    }
    return this.tutorialOf(userId, user);
  }

  // The tutorial as the User has it now, without turning it on: what the Assistant reads (getTutorial).
  peek(userId: string): Promise<TutorialDto> {
    return this.tutorialOf(userId);
  }

  // The facts of each quest by its key, which only the Assistant reads.
  facts(): ReadonlyMap<string, TutorialQuest['facts']> {
    return new Map(this.content.quests.map(({ key, facts }) => [key, facts]));
  }

  // 진행하기: keeps the quests' progress and shows the 내 정보 row again. A finished tutorial stays finished unless the
  // content has a quest the User has not completed (one added after `finishedAt`).
  async enable(userId: string): Promise<TutorialDto> {
    const enabledAt = new Date();
    await this.prisma.tutorialProgress.upsert({
      where: { userId },
      create: { userId, enabledAt },
      update: { enabledAt, stoppedAt: null, rowHiddenAt: null },
    });
    await this.prisma.tutorialProgress.updateMany({
      where: {
        userId,
        finishedAt: { not: null },
        OR: this.keys.map((questKey) => ({
          user: { tutorialQuests: { none: { questKey, completedAt: { not: null } } } },
        })),
      },
      data: { finishedAt: null },
    });
    return this.tutorialOf(userId);
  }

  async stop(userId: string): Promise<TutorialDto> {
    const stoppedAt = new Date();
    await this.prisma.tutorialProgress.upsert({
      where: { userId },
      create: { userId, stoppedAt },
      update: { stoppedAt },
    });
    return this.tutorialOf(userId);
  }

  async hideRow(userId: string): Promise<TutorialDto> {
    await this.ensureProgress(userId);
    await this.prisma.tutorialProgress.updateMany({
      where: { userId, rowHiddenAt: null },
      data: { rowHiddenAt: new Date() },
    });
    return this.tutorialOf(userId);
  }

  async start(userId: string, questKey: string): Promise<TutorialDto> {
    this.questOf(questKey);
    await this.prisma.tutorialQuestProgress.createMany({
      data: { userId, questKey, startedAt: new Date() },
      skipDuplicates: true,
    });
    return this.tutorialOf(userId);
  }

  // A quest completed once keeps how it was completed. A quest not started is started by its completion.
  async complete(userId: string, questKey: string, by: TutorialCompletion): Promise<TutorialDto> {
    const quest = this.questOf(questKey);
    if (!ACCEPTED_BY[quest.completion.kind].includes(by)) {
      throw new BadRequestException({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'Bad Request',
        code: 'COMPLETION_NOT_ACCEPTED',
        message: `A ${quest.completion.kind} quest is not completed by ${by}.`,
      });
    }
    const now = new Date();
    await this.prisma.tutorialQuestProgress.createMany({
      data: { userId, questKey, startedAt: now, completedAt: now, completedBy: by },
      skipDuplicates: true,
    });
    await this.prisma.tutorialQuestProgress.updateMany({
      where: { userId, questKey, completedAt: null },
      data: { completedAt: now, completedBy: by },
    });
    await this.finishIfAllCompleted(userId, now);
    return this.tutorialOf(userId);
  }

  // One statement after the quest's own, so that of two last completions sent together the later sees both.
  private async finishIfAllCompleted(userId: string, now: Date): Promise<void> {
    await this.ensureProgress(userId);
    await this.prisma.tutorialProgress.updateMany({
      where: {
        userId,
        finishedAt: null,
        AND: this.keys.map((questKey) => ({
          user: { tutorialQuests: { some: { questKey, completedAt: { not: null } } } },
        })),
      },
      data: { finishedAt: now },
    });
  }

  private async ensureProgress(userId: string): Promise<void> {
    await this.prisma.tutorialProgress.createMany({ data: { userId }, skipDuplicates: true });
  }

  private questOf(questKey: string): TutorialQuest {
    const quest = this.content.quests.find(({ key }) => key === questKey);
    if (quest === undefined) {
      throw notFound('TUTORIAL_QUEST_NOT_FOUND', 'The tutorial has no such quest.');
    }
    return quest;
  }

  // Rows of keys no longer in the content are left out.
  private async tutorialOf(userId: string, known?: User): Promise<TutorialDto> {
    const [user, progress, rows] = await Promise.all([
      known ?? this.users.findById(userId),
      this.prisma.tutorialProgress.findUnique({ where: { userId } }),
      this.prisma.tutorialQuestProgress.findMany({ where: { userId, questKey: { in: this.keys } } }),
    ]);
    return {
      state: tutorialState(progress, rows, this.keys),
      rowHidden: progress !== null && progress.rowHiddenAt !== null,
      eligibleByDefault: isEligibleByDefault(user, new Date()),
      categories: this.content.categories,
      quests: this.content.quests.map(({ facts: _facts, ...quest }) => ({
        ...quest,
        status: questStatus(rows.find(({ questKey }) => questKey === quest.key)),
      })),
    };
  }
}
