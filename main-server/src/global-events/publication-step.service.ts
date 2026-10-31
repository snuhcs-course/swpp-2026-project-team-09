/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { causeOf } from '../assistant/adapter.js';
import { PrismaService } from '../common/prisma.service.js';
import { Settings } from '../common/settings.js';
import {
  GlobalEventState,
  type Judgement,
  JudgementOutcome,
  type Prisma,
  PublicationRoute,
  SessionAttachment,
  type Source,
} from '../generated/prisma/client.js';
import { type PlaceDto } from '../places/dto/place.dto.js';
import { PlacesService } from '../places/places.service.js';
import { type UnsettledPostDto } from './dto/unsettled-post.dto.js';
import { GlobalEventsService } from './global-events.service.js';
import { type JudgedSession, storedSessions } from './judgement-answer.js';
import { placedSessions } from './judgement-checks.js';
import { readJudgedTime } from './judgement-time.js';
import {
  isChangedByAdministrator,
  judgedDrafts,
  JudgementsService,
  waitsForAJudgement,
  WITH_OWN_SESSIONS,
} from './judgements.service.js';
import { attachLinked } from './same-event.js';
import { settleJudgedSession, settleReadByRules } from './session-settling.js';

// Comparing a post with the events and publishing it are one statement to the other servers: a lock is taken for the
// transaction, so that of two posts of one event the second sees the first. It may wait for another server's post.
const STEP_TRANSACTION = { timeout: 30_000 };

interface PublishedValues {
  startsAt: Date | null;
  endsAt: Date | null;
  place: string | null;
  latitude: number;
  longitude: number;
  state: typeof GlobalEventState.published;
  publicationRoute: typeof PublicationRoute.judgement;
}

function publishedValues({ start, end, place }: JudgedSession, { latitude, longitude }: PlaceDto): PublishedValues {
  return {
    startsAt: readJudgedTime(start ?? '')?.at ?? null,
    endsAt: readJudgedTime(end ?? '')?.at ?? null,
    place,
    latitude,
    longitude,
    state: GlobalEventState.published,
    publicationRoute: PublicationRoute.judgement,
  };
}

// The step after a Collection's answer, which the worker waits for only five seconds. For each post: the link rule, then
// the rules' reading and a Judgement's, then the comparison with the events that exist, then publication of the sessions
// neither attached nor held. A post the link rule decided asks no model.
//
// A post's `stepFinishedAt` and its Judgement's tries answer different questions. The step comes back to a post at each
// Collection until it finishes, without limit, because going over it again costs nothing. A try is what costs, and only
// a Judgement's own count limits those, so a post left by a database failure asks the model no more often for it. The
// step finishes a post once its Judgement has an answer or no try left.
@Injectable()
export class PublicationStepService {
  private readonly logger = new Logger(PublicationStepService.name);
  private readonly publishes: boolean;
  private readonly judges: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly globalEvents: GlobalEventsService,
    private readonly judgements: JudgementsService,
    private readonly places: PlacesService,
    settings: ConfigService<Settings, true>,
  ) {
    this.publishes = settings.get('AUTOMATIC_PUBLICATION', { infer: true });
    this.judges = settings.get('AUTOMATIC_JUDGEMENT', { infer: true });
  }

  // Runs the step over every post of the Source not through it: those just stored, and those a failure or a restart
  // left before. Those it fails on wait for the next Collection of the Source. Never rejects.
  async run(source: Source): Promise<void> {
    try {
      // In one order, so that of two posts of one event in a message each server keeps the same one.
      const posts = await this.prisma.sourcePost.findMany({
        where: { source, stepFinishedAt: null },
        orderBy: { key: 'asc' },
      });
      const ids = await this.undecidedByLinks(posts.map(({ id }) => id));
      const due = this.judges ? await this.judgements.dueAmong(ids) : new Set<string>();
      // One at a time. Those that wait for no model go first, so that an outage holds up only what needs it.
      const published = await this.runOverPosts([
        ...ids.filter((id) => !due.has(id)),
        ...ids.filter((id) => due.has(id)),
      ]);
      if (published) {
        this.globalEvents.signalChanged();
      }
    } catch (error) {
      this.logger.error(`The step after the Collection of ${source} failed: ${String(error)}`);
    }
  }

  // Judges the post of a stored Draft and publishes what passes, whatever AUTOMATIC_JUDGEMENT says, for a later script.
  // The rules' sessions of its post stay as they are.
  async overDraft(globalEventId: string): Promise<Judgement | null> {
    const judgement = await this.judgements.judgeDraft(globalEventId);
    if (judgement !== null) {
      const published = await this.locked((tx) => this.settleJudged(tx, judgement.sourcePostId));
      if (published) {
        this.globalEvents.signalChanged();
      }
    }
    return judgement;
  }

  // The link rule over a post, and gives whether it decided the post, which then needs no more of the step.
  overLinks(sourcePostId: string): Promise<boolean> {
    return this.locked(async (tx) => {
      const post = await tx.sourcePost.findUniqueOrThrow({ where: { id: sourcePostId }, include: WITH_OWN_SESSIONS });
      const decided = await attachLinked(tx, post);
      if (decided) {
        await this.finish(tx, sourcePostId);
      }
      return decided;
    });
  }

  // Attaches, holds or publishes the sessions of a post that the rules read or a Judgement passed, and gives whether it
  // published one. An event an Administrator has changed or discarded meanwhile is left as it is. With automatic
  // publication off, what is not attached stays a Draft. The version stays: it counts an Administrator's changes.
  publishPost(sourcePostId: string): Promise<boolean> {
    return this.locked(async (tx) => {
      const stored = await tx.sourcePost.findUniqueOrThrow({ where: { id: sourcePostId }, include: WITH_OWN_SESSIONS });
      const byRules = await settleReadByRules(tx, stored, this.publishes);
      const judged = await this.settleJudged(tx, sourcePostId);
      const post = await tx.sourcePost.findUniqueOrThrow({
        where: { id: sourcePostId },
        include: { judgement: true, ...WITH_OWN_SESSIONS },
      });
      // With Judgements turned off meanwhile, no try will come.
      if (!this.judges || post.judgement === null || !waitsForAJudgement(post, post.judgement)) {
        await this.finish(tx, sourcePostId);
      }
      return byRules || judged;
    });
  }

  // The posts an Administrator should know of: the step failed on them or has not finished with them, or their Judgement
  // could not be made and a Draft of theirs still waits.
  async unsettledPosts(): Promise<UnsettledPostDto[]> {
    const posts = await this.prisma.sourcePost.findMany({
      where: {
        OR: [
          { stepFinishedAt: null },
          {
            judgement: { outcome: JudgementOutcome.failed },
            sessions: { some: { attachedBy: SessionAttachment.own, globalEvent: { state: GlobalEventState.draft } } },
          },
        ],
      },
      orderBy: [{ source: 'asc' }, { key: 'asc' }],
      include: { judgement: true, ...WITH_OWN_SESSIONS },
    });
    return posts.map(({ source, key, address, stepFinishedAt, stepFailure, stepFailedAt, judgement, sessions }) => ({
      source,
      key,
      address,
      stepFinished: stepFinishedAt !== null,
      stepFailure,
      stepFailedAt: stepFailedAt?.toISOString() ?? null,
      judgementFailure: judgement?.failure ?? null,
      judgementAttempts: judgement?.attempts ?? 0,
      drafts: sessions.flatMap(({ globalEvent: { id, title, state } }) =>
        state === GlobalEventState.draft ? [{ id, title }] : [],
      ),
    }));
  }

  private locked<T>(work: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(8008)`;
      return work(tx);
    }, STEP_TRANSACTION);
  }

  private async finish(tx: Prisma.TransactionClient, sourcePostId: string): Promise<void> {
    await tx.sourcePost.update({
      where: { id: sourcePostId },
      data: { stepFinishedAt: new Date(), stepFailure: null, stepFailedAt: null },
    });
  }

  // The posts the link rule did not decide. A post it failed on is left out: it waits for the next Collection, and must
  // not be published before the rule has looked at it.
  private async undecidedByLinks(sourcePostIds: string[]): Promise<string[]> {
    const undecided: string[] = [];
    for (const sourcePostId of sourcePostIds) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- one post at a time, so that one post's failure stops only it
        if (!(await this.overLinks(sourcePostId))) {
          undecided.push(sourcePostId);
        }
      } catch (error) {
        // oxlint-disable-next-line no-await-in-loop -- as above
        await this.stepFailed(sourcePostId, error);
      }
    }
    return undecided;
  }

  // Compares the passing sessions of the post's Judgement with the events, and publishes those left, once. Those attached
  // with automatic publication off keep their event, so a later run over the Draft takes up only the rest. Nothing,
  // should an Administrator have changed any of the post's events while the model read it: they may have split off a
  // session the answer holds too.
  private async settleJudged(tx: Prisma.TransactionClient, sourcePostId: string): Promise<boolean> {
    const post = await tx.sourcePost.findUniqueOrThrow({ where: { id: sourcePostId }, include: WITH_OWN_SESSIONS });
    const judgement = await tx.judgement.findUnique({ where: { sourcePostId } });
    if (judgement?.outcome !== JudgementOutcome.judged || judgement.publishedAt !== null) {
      return false;
    }
    if (this.publishes) {
      await tx.judgement.update({ where: { sourcePostId }, data: { publishedAt: new Date() } });
    }
    if (isChangedByAdministrator(post)) {
      return false;
    }
    const sessions = storedSessions(judgement.sessions);
    const drafts = judgedDrafts(post);
    const placed = placedSessions(
      sessions.filter(({ globalEventId }) => globalEventId === null),
      drafts.map(({ globalEvent: { id, startsAt } }) => ({ id, startsAt })),
    );
    const places = new Map((await this.places.list()).map((place) => [place.id, place]));
    const {
      _max: { number: last },
    } = await tx.sourcePostSession.aggregate({ where: { sourcePostId }, _max: { number: true } });
    let number = (last ?? 0) + 1;
    let published = false;
    const written: JudgedSession[] = [];
    for (const session of sessions) {
      const place = places.get(session.placeId ?? '');
      const draftId = placed.get(session);
      if (place === undefined || draftId === undefined) {
        written.push(session);
      } else {
        const draft = drafts.find(({ globalEventId }) => globalEventId === draftId);
        const values = publishedValues(session, place);
        // oxlint-disable-next-line no-await-in-loop -- one transaction runs one statement at a time
        const settled = await settleJudgedSession(tx, { post, draft, number, values, publishes: this.publishes });
        number += draft === undefined ? 1 : 0;
        published = published || settled.published;
        written.push({ ...session, globalEventId: settled.globalEventId });
      }
    }
    await tx.judgement.update({ where: { sourcePostId }, data: { sessions: written } });
    return published;
  }

  private async stepFailed(sourcePostId: string, error: unknown): Promise<void> {
    const cause = causeOf(error);
    this.logger.error(`The step failed on Source Post ${sourcePostId}: ${cause}`);
    await this.recordFailure(sourcePostId, cause);
  }

  private async runOverPosts(sourcePostIds: string[]): Promise<boolean> {
    let published = false;
    for (const sourcePostId of sourcePostIds) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- one post at a time, so that one post's failure stops only it
        published = (await this.overPost(sourcePostId)) || published;
      } catch (error) {
        // oxlint-disable-next-line no-await-in-loop -- as above
        await this.stepFailed(sourcePostId, error);
      }
    }
    return published;
  }

  // No transaction holds the call to the model.
  private async overPost(sourcePostId: string): Promise<boolean> {
    if (this.judges) {
      await this.judgements.judgePost(sourcePostId);
    }
    return this.publishPost(sourcePostId);
  }

  // For Administrators. The failure may be the database's, in which case the log has it and the next Collection comes.
  private async recordFailure(sourcePostId: string, cause: string): Promise<void> {
    try {
      await this.prisma.sourcePost.update({
        where: { id: sourcePostId },
        data: { stepFailure: cause, stepFailedAt: new Date() },
      });
    } catch (error) {
      this.logger.error(`The failure on Source Post ${sourcePostId} was not recorded: ${causeOf(error)}`);
    }
  }
}
