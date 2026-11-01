/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Model, MODEL_PORT } from '../assistant/adapter.js';
import { PrismaService } from '../common/prisma.service.js';
import { Settings } from '../common/settings.js';
import { type Judgement, JudgementOutcome, type Prisma, SameEventOutcome } from '../generated/prisma/client.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { storedSessions } from './judgement-answer.js';
import { type JudgementLimits } from './judgement-model.js';
import { readJudgedTime } from './judgement-time.js';
import {
  isChangedByAdministrator,
  placedOfPost,
  type PostWithOwnSessions,
  WITH_OWN_SESSIONS,
} from './judgements.service.js';
import { matchAmong, candidatesLeft, sameEventCandidates, type ComparedSession } from './same-event.js';
import { chooseSameEvent, type SessionToCompare } from './same-event-choice.js';
import { awaitsComparison } from './session-settling.js';

type PostToAsk = PostWithOwnSessions & { judgement: Judgement | null };

// The sessions of a post that the rules read and those a Judgement passed, that the step has not settled.
function sessionsOf(post: PostToAsk, judgedOnly: boolean): (ComparedSession & { place: string | null })[] {
  const byRules = post.sessions.flatMap((session) => {
    const { title, startsAt, place } = session.globalEvent;
    return !judgedOnly && awaitsComparison(session) && startsAt !== null ? [{ title, startsAt, place }] : [];
  });
  const { judgement } = post;
  if (
    judgement?.outcome !== JudgementOutcome.judged ||
    judgement.publishedAt !== null ||
    isChangedByAdministrator(post)
  ) {
    return byRules;
  }
  const title = post.sessions[0]?.globalEvent.title ?? '';
  const byJudgement = [...placedOfPost(post, storedSessions(judgement.sessions)).keys()].flatMap(({ start, place }) => {
    const startsAt = readJudgedTime(start ?? '')?.at;
    return startsAt === undefined ? [] : [{ title, startsAt, place }];
  });
  return [...byRules, ...byJudgement];
}

// Asks the model about the sessions the rules leave, outside any transaction, and stores what it answers. It attaches
// nothing: the step applies an answer under its lock, once it has checked that the answer still holds.
@Injectable()
export class SameEventChoicesService {
  private readonly logger = new Logger(SameEventChoicesService.name);
  private readonly limits: JudgementLimits;
  private readonly comparesTitles: boolean;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MODEL_PORT) private readonly model: Model,
    @Inject(CLOCK) private readonly clock: Clock,
    settings: ConfigService<Settings, true>,
  ) {
    this.limits = {
      timeoutMs: settings.get('JUDGEMENT_TIMEOUT_MS', { infer: true }),
      maxOutputTokens: settings.get('JUDGEMENT_MAX_OUTPUT_TOKENS', { infer: true }),
    };
    this.comparesTitles = settings.get('SAME_EVENT_TITLE_RULE', { infer: true });
  }

  // Which of the posts would ask the model now, so that the step can take them after those that wait for no model.
  async dueAmong(sourcePostIds: string[]): Promise<Set<string>> {
    const due = new Set<string>();
    for (const sourcePostId of sourcePostIds) {
      // oxlint-disable-next-line no-await-in-loop -- the database's reads of one post at a time are few
      if ((await this.toAsk(sourcePostId)).length > 0) {
        due.add(sourcePostId);
      }
    }
    return due;
  }

  // Asks about the sessions no one has asked about: one call for the post, whose rows are claimed first. Sessions with no
  // candidate left, or that the title rule decides, ask nothing. `judgedOnly` is for a run over a Draft, which leaves the
  // rules' sessions as they are and would not apply an answer about them.
  async ask(sourcePostId: string, judgedOnly = false): Promise<void> {
    const sessions = await this.toAsk(sourcePostId, judgedOnly);
    if (sessions.length === 0) {
      return;
    }
    const now = this.clock.now();
    const claimed = await this.prisma.sameEventAnswer.createManyAndReturn({
      data: sessions.map(({ startsAt, candidates }) => ({
        sourcePostId,
        startsAt,
        askedEventIds: candidates.map(({ id }) => id),
        claimedAt: now,
      })),
      skipDuplicates: true,
    });
    const mine = sessions.filter(({ startsAt }) =>
      claimed.some((row) => row.startsAt.getTime() === startsAt.getTime()),
    );
    if (mine.length > 0) {
      await this.askAndStore(sourcePostId, mine, now);
    }
  }

  // Whether another server's call about the post is still running, under the step's lock: the post is then left to it. A
  // call older than it may take was left by a server that stopped, and is recorded as failed.
  async isBeingAsked(tx: Prisma.TransactionClient, sourcePostId: string): Promise<boolean> {
    const left = new Date(this.clock.now().getTime() - 2 * this.limits.timeoutMs);
    await tx.sameEventAnswer.updateMany({
      where: { sourcePostId, outcome: null, claimedAt: { lt: left } },
      data: { outcome: SameEventOutcome.failed, failure: 'The server stopped during the call' },
    });
    return (await tx.sameEventAnswer.count({ where: { sourcePostId, outcome: null } })) > 0;
  }

  private async toAsk(sourcePostId: string, judgedOnly = false): Promise<SessionToCompare[]> {
    const post = await this.prisma.sourcePost.findUniqueOrThrow({
      where: { id: sourcePostId },
      include: { judgement: true, sameEventAnswers: { select: { startsAt: true } }, ...WITH_OWN_SESSIONS },
    });
    const asked = new Set(post.sameEventAnswers.map(({ startsAt }) => startsAt.getTime()));
    const toAsk = new Map<number, SessionToCompare>();
    for (const session of sessionsOf(post, judgedOnly)) {
      const at = session.startsAt.getTime();
      const same = toAsk.get(at);
      if (same !== undefined) {
        // Two sessions at one start have one answer, so it reads both their places.
        same.place = [same.place, session.place].filter((place) => place !== null).join(' / ');
      } else if (!asked.has(at)) {
        // oxlint-disable-next-line no-await-in-loop -- few sessions, and no transaction is held
        const events = await sameEventCandidates(this.prisma, session.startsAt, sourcePostId);
        const candidates = candidatesLeft(session, events);
        const decided = this.comparesTitles && matchAmong(session, events).kind !== 'none';
        if (!decided && candidates.length > 0) {
          toAsk.set(at, { ...session, candidates });
        }
      }
    }
    return [...toAsk.values()];
  }

  private async askAndStore(sourcePostId: string, sessions: SessionToCompare[], now: Date): Promise<void> {
    const post = await this.prisma.sourcePost.findUniqueOrThrow({
      where: { id: sourcePostId },
      include: WITH_OWN_SESSIONS,
    });
    const event = post.sessions[0]?.globalEvent;
    const { choices, modelId } = await chooseSameEvent(
      this.model,
      { post: { title: event?.title ?? '', text: event?.description ?? '' }, source: post.source, sessions },
      this.limits,
    );
    for (const { startsAt, outcome, globalEventId, reason, failure } of choices) {
      if (failure !== null) {
        // Never the post's text or the answer.
        this.logger.warn(`The AI's choice for Source Post ${sourcePostId} could not be made: ${failure}`);
      }
      // oxlint-disable-next-line no-await-in-loop -- few sessions
      await this.prisma.sameEventAnswer.updateMany({
        where: { sourcePostId, startsAt, outcome: null },
        data: { outcome, chosenEventId: globalEventId, reason, failure, modelId, answeredAt: now },
      });
    }
  }
}
