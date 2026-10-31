/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { causeOf, type Model, MODEL_PORT } from '../assistant/adapter.js';
import { PrismaService } from '../common/prisma.service.js';
import { Settings } from '../common/settings.js';
import {
  GlobalEventState,
  type Judgement,
  JudgementOutcome,
  type Prisma,
  SessionAttachment,
} from '../generated/prisma/client.js';
import { PlacesService } from '../places/places.service.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { checkedSessions } from './judgement-checks.js';
import { askForJudgement, type JudgementLimits } from './judgement-model.js';
import { maskedPost } from './judgement-post.js';
import { POST_SOURCE_NAMES, POST_SOURCES } from './post-sources.js';

// A Judgement is tried at most this many times, whatever happens to each try: a try counts when it is claimed.
export const JUDGEMENT_TRIES = 2;

export const WITH_OWN_SESSIONS = {
  sessions: {
    where: { attachedBy: SessionAttachment.own },
    orderBy: { number: 'asc' },
    include: { globalEvent: true },
  },
} satisfies Prisma.SourcePostInclude;

const WITH_SESSIONS = { judgement: true, ...WITH_OWN_SESSIONS } satisfies Prisma.SourcePostInclude;

export type PostWithOwnSessions = Prisma.SourcePostGetPayload<{ include: typeof WITH_OWN_SESSIONS }>;

// The sessions of a post a Judgement reads for: those the rules did not read, that are still Drafts as collected, and
// that do not wait for an Administrator's decision.
export function judgedDrafts({ sessions }: Pick<PostWithOwnSessions, 'sessions'>): PostWithOwnSessions['sessions'] {
  return sessions.filter(
    ({ readByRules, heldFor, globalEvent }) =>
      !readByRules && heldFor === null && globalEvent.state === GlobalEventState.draft,
  );
}

// An Administrator's change raises a version. After one, whatever the model reads of the post could override their
// work, or repeat a session they split off by hand, so that post is never judged.
export function isChangedByAdministrator({ sessions }: Pick<PostWithOwnSessions, 'sessions'>): boolean {
  return sessions.some(({ globalEvent }) => globalEvent.version !== 1);
}

// Whether the post has a Draft a Judgement may read.
function isJudgeable(post: Pick<PostWithOwnSessions, 'sessions'>): boolean {
  return !isChangedByAdministrator(post) && judgedDrafts(post).length > 0;
}

// Whether the step should come back to a post for its Judgement: a try is running or was left by a server that stopped,
// or one that could not be made has a try left. Not a post no longer to be judged.
export function waitsForAJudgement(
  post: Pick<PostWithOwnSessions, 'sessions'>,
  { outcome, attempts }: Judgement,
): boolean {
  return isJudgeable(post) && (outcome === null || (outcome === JudgementOutcome.failed && attempts < JUDGEMENT_TRIES));
}

// The start kept on a session that left its own Draft.
function ownDraftStart(ownDraft: Prisma.JsonValue): Date | null {
  const { startsAt } = z.object({ startsAt: z.iso.datetime().nullable() }).parse(ownDraft);
  return startsAt === null ? null : new Date(startsAt);
}

// Reads Drafts with the model and stores what it read. It publishes nothing and calls the model outside any transaction.
@Injectable()
export class JudgementsService {
  private readonly logger = new Logger(JudgementsService.name);
  private readonly limits: JudgementLimits;
  private readonly keyConfigured: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly places: PlacesService,
    @Inject(MODEL_PORT) private readonly model: Model,
    @Inject(CLOCK) private readonly clock: Clock,
    settings: ConfigService<Settings, true>,
  ) {
    this.limits = {
      timeoutMs: settings.get('JUDGEMENT_TIMEOUT_MS', { infer: true }),
      maxOutputTokens: settings.get('JUDGEMENT_MAX_OUTPUT_TOKENS', { infer: true }),
    };
    this.keyConfigured = settings.get('OPENROUTER_API_KEY', { infer: true }) !== '';
  }

  // Judges the post of a Draft, whatever AUTOMATIC_JUDGEMENT says: the step for a later script and for the evaluation.
  // Answers with the post's stored Judgement, or null when the post is not to be judged. One call reads the whole post,
  // since its Drafts share one text.
  async judgeDraft(globalEventId: string): Promise<Judgement | null> {
    const own = await this.prisma.sourcePostSession.findFirst({
      where: { globalEventId, attachedBy: SessionAttachment.own },
    });
    if (own === null) {
      throw new NotFoundException('The Global Event has no post of its own to judge');
    }
    return this.judgePost(own.sourcePostId);
  }

  // Answers with the post's Judgement as it now is. Another server's try that is still running is left to finish.
  async judgePost(sourcePostId: string): Promise<Judgement | null> {
    if (!this.keyConfigured) {
      throw new Error('A Judgement needs OPENROUTER_API_KEY');
    }
    const post = await this.prisma.sourcePost.findUniqueOrThrow({
      where: { id: sourcePostId },
      include: WITH_SESSIONS,
    });
    if (!isJudgeable(post)) {
      return post.judgement;
    }
    const claimed = await this.claim(sourcePostId);
    if (claimed === null) {
      return this.prisma.judgement.findUnique({ where: { sourcePostId } });
    }
    return this.judge(post, claimed);
  }

  // Which of the posts have a try to make, so that the step can take them after those that wait for no model.
  async dueAmong(sourcePostIds: string[]): Promise<Set<string>> {
    const posts = await this.prisma.sourcePost.findMany({
      where: { id: { in: sourcePostIds } },
      include: WITH_SESSIONS,
    });
    const due = posts.filter((post) =>
      post.judgement === null ? isJudgeable(post) : waitsForAJudgement(post, post.judgement),
    );
    return new Set(due.map(({ id }) => id));
  }

  // Counts a try before the call, in one statement, so that of two servers one calls, and a server that dies during the
  // call has used its try. A claim older than the time a call may take was left by such a server. With no try left, it
  // is recorded as a Judgement that could not be made.
  private async claim(sourcePostId: string): Promise<Judgement | null> {
    const now = this.clock.now();
    const left = new Date(now.getTime() - 2 * this.limits.timeoutMs);
    await this.prisma.judgement.createMany({ data: [{ sourcePostId }], skipDuplicates: true });
    const free: Prisma.JudgementWhereInput = {
      sourcePostId,
      OR: [{ claimedAt: null }, { claimedAt: { lt: left } }],
    };
    const [claimed] = await this.prisma.judgement.updateManyAndReturn({
      where: {
        AND: [free, { OR: [{ outcome: null }, { outcome: JudgementOutcome.failed }] }],
        attempts: { lt: JUDGEMENT_TRIES },
      },
      data: { attempts: { increment: 1 }, claimedAt: now, outcome: null, failure: null },
    });
    if (claimed === undefined) {
      await this.prisma.judgement.updateMany({
        where: { ...free, outcome: null, attempts: { gte: JUDGEMENT_TRIES } },
        data: { outcome: JudgementOutcome.failed, failure: 'The server stopped during the call', claimedAt: null },
      });
    }
    return claimed ?? null;
  }

  private async judge(post: PostWithOwnSessions, claim: Judgement): Promise<Judgement> {
    const now = this.clock.now();
    const event = post.sessions[0]?.globalEvent;
    const masked = maskedPost({ title: event?.title ?? '', text: event?.description ?? '' });
    const source = POST_SOURCE_NAMES.find((name) => name === post.source);
    if (source === undefined) {
      throw new Error(`Source ${post.source} has no settings for its posts`);
    }
    // A session the rules read may have gone to another event at an earlier try, and is no new session for this one.
    const attached = await this.prisma.sourcePostSession.findMany({
      where: { sourcePostId: post.id, readByRules: true, attachedBy: { not: SessionAttachment.own } },
    });
    let answered: Prisma.JudgementUpdateManyMutationInput;
    try {
      const { answer, modelId } = await askForJudgement(this.model, masked, source, now, this.limits);
      const sessions = checkedSessions(answer, {
        post: masked,
        source: POST_SOURCES[source],
        places: await this.places.list(),
        now,
        readStarts: [
          ...post.sessions.flatMap(({ readByRules, globalEvent: { startsAt } }) =>
            readByRules && startsAt !== null ? [startsAt] : [],
          ),
          ...attached.flatMap(({ ownDraft }) => {
            const startsAt = ownDraftStart(ownDraft);
            return startsAt === null ? [] : [startsAt];
          }),
        ],
      });
      answered = {
        outcome: answer.announcesEvent ? JudgementOutcome.judged : JudgementOutcome.no_event,
        announcesEvent: answer.announcesEvent,
        sessions,
        modelId,
        judgedAt: now,
      };
    } catch (error) {
      const failure = causeOf(error);
      // Never the post's text or the answer.
      this.logger.warn(`The Judgement of Source Post ${post.id} could not be made: ${failure}`);
      answered = { outcome: JudgementOutcome.failed, failure, judgedAt: now };
    }
    const [stored] = await this.prisma.judgement.updateManyAndReturn({
      // A try that outlived its claim does not write over the next.
      where: { id: claim.id, attempts: claim.attempts },
      data: { ...answered, claimedAt: null },
    });
    return stored ?? claim;
  }
}
