/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { BadRequestException, HttpStatus, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service.js';
import { TutorialCompletion } from '../generated/prisma/client.js';
import { notFound } from '../quests/refusals.js';
import { UsersService } from '../users/users.service.js';
import { affiliationOf } from './affiliation.js';
import { TutorialDto } from './dto/tutorial.dto.js';
import { type TutorialContent, type TutorialQuest } from './tutorial-content.js';
import { eligibleByDefault, questStatus, tutorialState } from './tutorial-state.js';

export const TUTORIAL_CONTENT = 'TUTORIAL_CONTENT';

// The completions each kind of quest accepts. The phone does the 관정 check, so the server records how and does not
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
    if (eligibleByDefault({ admissionYear: user.admissionYear, affiliation: affiliationOf(user) }, now)) {
      await this.ensureProgress(userId);
      await this.prisma.tutorialProgress.updateMany({
        where: { userId, enabledAt: null, stoppedAt: null },
        data: { enabledAt: now },
      });
    }
    return this.tutorialOf(userId);
  }

  // 진행하기: keeps the quests' progress.
  async enable(userId: string): Promise<TutorialDto> {
    const enabledAt = new Date();
    await this.prisma.tutorialProgress.upsert({
      where: { userId },
      create: { userId, enabledAt },
      update: { enabledAt, stoppedAt: null, finishedAt: null },
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
  private async tutorialOf(userId: string): Promise<TutorialDto> {
    const [progress, rows] = await Promise.all([
      this.prisma.tutorialProgress.findUnique({ where: { userId } }),
      this.prisma.tutorialQuestProgress.findMany({ where: { userId, questKey: { in: this.keys } } }),
    ]);
    return {
      state: tutorialState(progress, rows, this.keys),
      quests: this.content.quests.map((quest) => ({
        ...quest,
        status: questStatus(rows.find(({ questKey }) => questKey === quest.key)),
      })),
    };
  }
}
