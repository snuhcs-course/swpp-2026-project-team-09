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
import { periodEndAt, readJudgedTime } from './judgement-time.js';
import {
  isChangedByAdministrator,
  judgedDrafts,
  JudgementsService,
  waitsForAJudgement,
  WITH_OWN_SESSIONS,
} from './judgements.service.js';

type PostWithOwnSessions = Prisma.SourcePostGetPayload<{ include: typeof WITH_OWN_SESSIONS }>;

interface PublishedValues {
  startsAt: Date | null;
  endsAt: Date | null;
  place: string | null;
  latitude: number;
  longitude: number;
  state: typeof GlobalEventState.published;
  publicationRoute: typeof PublicationRoute.judgement;
}

function publishedValues(
  { start, end, place, overPeriod }: JudgedSession,
  { latitude, longitude }: PlaceDto,
): PublishedValues {
  const ends = readJudgedTime(end ?? '');
  return {
    startsAt: readJudgedTime(start ?? '')?.at ?? null,
    endsAt: ends === null ? null : overPeriod ? periodEndAt(ends) : ends.at,
    place,
    latitude,
    longitude,
    state: GlobalEventState.published,
    publicationRoute: PublicationRoute.judgement,
  };
}

// The step after a Collection's answer, which the worker waits for only five seconds. For each post, the rules' reading
// and then a Judgement's, and then publication. The same event (tickets 08a, 08b) comes in before publication.
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
      const posts = await this.prisma.sourcePost.findMany({ where: { source, stepFinishedAt: null } });
      const ids = posts.map(({ id }) => id);
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
      const published = await this.prisma.$transaction((tx) => this.publishJudged(tx, judgement.sourcePostId));
      if (published) {
        this.globalEvents.signalChanged();
      }
    }
    return judgement;
  }

  // Publishes the sessions of a post that the rules read or a Judgement passed, and gives whether it published one. An
  // event an Administrator has changed or discarded meanwhile is left as it is. With automatic publication off, every
  // session stays a Draft. The version stays: it counts an Administrator's changes.
  publishPost(sourcePostId: string): Promise<boolean> {
    return this.prisma.$transaction(async (tx) => {
      const { count } = this.publishes
        ? await tx.globalEvent.updateMany({
            where: {
              state: GlobalEventState.draft,
              version: 1,
              sessions: { some: { sourcePostId, readByRules: true } },
            },
            data: { state: GlobalEventState.published, publicationRoute: PublicationRoute.rule },
          })
        : { count: 0 };
      const judged = await this.publishJudged(tx, sourcePostId);
      const post = await tx.sourcePost.findUniqueOrThrow({
        where: { id: sourcePostId },
        include: { judgement: true, ...WITH_OWN_SESSIONS },
      });
      // With Judgements turned off meanwhile, no try will come.
      if (!this.judges || post.judgement === null || !waitsForAJudgement(post, post.judgement)) {
        await tx.sourcePost.update({
          where: { id: sourcePostId },
          data: { stepFinishedAt: new Date(), stepFailure: null, stepFailedAt: null },
        });
      }
      return count > 0 || judged;
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
            sessions: { some: { globalEvent: { state: GlobalEventState.draft } } },
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

  // Publishes the passing sessions of the post's Judgement, once. Nothing, should an Administrator have changed any of
  // the post's events while the model read it: they may have split off a session the answer holds too.
  private async publishJudged(tx: Prisma.TransactionClient, sourcePostId: string): Promise<boolean> {
    if (!this.publishes) {
      return false;
    }
    const post = await tx.sourcePost.findUniqueOrThrow({ where: { id: sourcePostId }, include: WITH_OWN_SESSIONS });
    const { count: taken } = await tx.judgement.updateMany({
      where: { sourcePostId, outcome: JudgementOutcome.judged, publishedAt: null },
      data: { publishedAt: new Date() },
    });
    if (taken === 0 || isChangedByAdministrator(post)) {
      return false;
    }
    const judgement = await tx.judgement.findUniqueOrThrow({ where: { sourcePostId } });
    const sessions = storedSessions(judgement.sessions);
    const placed = placedSessions(
      sessions,
      judgedDrafts(post).map(({ globalEvent: { id, startsAt } }) => ({ id, startsAt })),
    );
    const places = new Map((await this.places.list()).map((place) => [place.id, place]));
    let next = Math.max(0, ...post.sessions.map(({ number }) => number)) + 1;
    const written: JudgedSession[] = [];
    for (const session of sessions) {
      const place = places.get(session.placeId ?? '');
      const draftId = placed.get(session);
      let globalEventId: string | null = null;
      if (place !== undefined && draftId !== undefined) {
        const values = publishedValues(session, place);
        // oxlint-disable-next-line no-await-in-loop -- one transaction runs one statement at a time
        globalEventId = await (draftId === null
          ? this.createEvent(tx, post, next, values)
          : this.publishDraft(tx, draftId, values));
        next += draftId === null ? 1 : 0;
      }
      written.push({ ...session, globalEventId });
    }
    await tx.judgement.update({ where: { sourcePostId }, data: { sessions: written } });
    return written.some(({ globalEventId }) => globalEventId !== null);
  }

  // A session the post was not stored with: one more own session of the post.
  private async createEvent(
    tx: Prisma.TransactionClient,
    { id: sourcePostId, sessions }: PostWithOwnSessions,
    number: number,
    values: PublishedValues,
  ): Promise<string> {
    const { title, description } = sessions[0]?.globalEvent ?? { title: '', description: '' };
    const { id } = await tx.globalEvent.create({
      data: {
        ...values,
        title,
        description,
        sessions: { create: { sourcePostId, number, attachedBy: SessionAttachment.own } },
      },
    });
    return id;
  }

  // Empty when an Administrator reached it first.
  private async publishDraft(
    tx: Prisma.TransactionClient,
    id: string,
    values: PublishedValues,
  ): Promise<string | null> {
    const { count } = await tx.globalEvent.updateMany({
      where: { id, state: GlobalEventState.draft, version: 1 },
      data: values,
    });
    return count === 0 ? null : id;
  }

  private async runOverPosts(sourcePostIds: string[]): Promise<boolean> {
    let published = false;
    for (const sourcePostId of sourcePostIds) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- one post at a time, so that one post's failure stops only it
        published = (await this.overPost(sourcePostId)) || published;
      } catch (error) {
        const cause = causeOf(error);
        this.logger.error(`The step failed on Source Post ${sourcePostId}: ${cause}`);
        // oxlint-disable-next-line no-await-in-loop -- as above
        await this.recordFailure(sourcePostId, cause);
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
