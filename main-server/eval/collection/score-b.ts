/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type GoldPair, type PairSide } from './gold.ts';
import { type PostReading } from './reading.ts';
import { type Rate } from './score-a.ts';
import {
  type AskAboutPost,
  comparableSessions,
  publishedSessions,
  isRefused,
  type NewPost,
  type Partner,
  type SessionFate,
  sessionId,
  stepOfPost,
  type StepMode,
} from './same-event-step.ts';

// Evaluation B's scores (metrics document, 2 B): the step over each post the set pairs with an earlier one, and each pair
// read from what became of its sessions. How a blank in that document is read was settled by the P05 owner on 2026-11-01,
// and is in the ticket's comments.

export interface PairResult {
  id: string;
  sameEvent: boolean;
  newPost: string;
  stored: string;
  result: 'attached' | 'held' | 'none';
  // Whether the candidate step reached the pair: a link, or a session of each side within a day.
  reached: boolean;
  by: string | null;
}

export interface FailureRowB {
  id: string;
  failed: string;
  cause: string;
}

export interface ScoreB {
  d1: number;
  d2: { tp: number; fp: number; fn: number; precision: number | null; recall: number | null; f1: number | null };
  recallWithQueue: Rate;
  d3: Rate;
  d4: Rate & { byHold: Record<string, number> };
  d5: Rate;
  d6: Rate;
  pairs: PairResult[];
  rows: FailureRowB[];
}

// Which of a pair's posts came first, as the Sources post: every saved body link goes from SNU Now to extra.snu, and a key
// grows with time on its Source. A pair that came the other way is not measured, and the record says so.
function arrival(post: string): [number, number] {
  return [post.startsWith('extra-') ? 0 : 1, Number(post.replaceAll(/\D/gu, ''))];
}

export function isEarlier(first: string, second: string): boolean {
  const [[source, key], [otherSource, otherKey]] = [arrival(first), arrival(second)];
  return source === otherSource ? key < otherKey : source < otherSource;
}

export function storedAndNew({ a, b }: GoldPair): { stored: PairSide; fresh: PairSide } {
  return isEarlier(a.post, b.post) ? { stored: a, fresh: b } : { stored: b, fresh: a };
}

function unionOf(scope: number[] | null, session: number | null): number[] | null {
  return scope === null || session === null ? null : [...scope, session];
}

function newPosts(pairs: GoldPair[], readings: Map<string, PostReading>): NewPost[] {
  const posts = new Map<string, NewPost>();
  const readingOf = (post: string): PostReading => {
    const reading = readings.get(post);
    if (reading === undefined) {
      throw new Error(`${post} has no reading`);
    }
    return reading;
  };
  for (const pair of pairs) {
    const { stored, fresh } = storedAndNew(pair);
    const known = posts.get(fresh.post);
    const scope = fresh.session === null ? null : [fresh.session];
    const newPost: NewPost = known ?? { reading: readingOf(fresh.post), partners: [], sessions: scope };
    newPost.sessions = known === undefined ? scope : unionOf(known.sessions, fresh.session);
    const partner: Partner | undefined = newPost.partners.find(({ reading }) => reading.post.post === stored.post);
    if (partner === undefined) {
      newPost.partners.push({
        reading: readingOf(stored.post),
        sessions: stored.session === null ? null : [stored.session],
      });
    } else {
      partner.sessions = unionOf(partner.sessions, stored.session);
    }
    posts.set(fresh.post, newPost);
  }
  return [...posts.values()].toSorted(({ reading: first }, { reading: second }) =>
    isEarlier(first.post.post, second.post.post) ? -1 : 1,
  );
}

const inScope = (side: PairSide, number: number): boolean => side.session === null || side.session === number;

const isOfSide = (id: string, side: PairSide): boolean =>
  id.startsWith(`${side.post}#`) && (side.session === null || id === sessionId(side.post, side.session));

function pairResult(pair: GoldPair, fates: SessionFate[]): PairResult {
  const { stored, fresh } = storedAndNew(pair);
  const toStored = (id: string): boolean => isOfSide(id, stored);
  const own = fates.filter(({ number }) => inScope(fresh, number));
  const attached = own.find((fate) => fate.kind === 'attached' && toStored(fate.to));
  const held = own.some((fate) => fate.kind === 'held' && fate.candidates.some((id) => toStored(id)));
  return {
    id: pair.id,
    sameEvent: pair.sameEvent,
    newPost: fresh.post,
    stored: stored.post,
    result: attached === undefined ? (held ? 'held' : 'none') : 'attached',
    reached: own.some(({ candidates }) => candidates.some((id) => toStored(id))),
    by: attached?.kind === 'attached' ? attached.by : null,
  };
}

function causeOfTruePair(
  result: PairResult,
  pair: GoldPair,
  readings: Map<string, PostReading>,
  mode: StepMode,
): string {
  if (!result.reached) {
    return '후보 단계 누락';
  }
  const { stored, fresh } = storedAndNew(pair);
  const sessionsOf = (post: string, of: typeof comparableSessions): ReturnType<typeof comparableSessions> => {
    const reading = readings.get(post);
    return reading === undefined ? [] : of(reading);
  };
  const theirs = sessionsOf(stored.post, publishedSessions);
  if (sessionsOf(fresh.post, comparableSessions).every((one) => theirs.every((other) => isRefused(one, other)))) {
    return '금지 규칙';
  }
  if (pair.chosenAs === 'many-to-one') {
    return '다대일';
  }
  return mode === 'ai' ? '모델 판단' : '제목 규칙 밖 (AI의 몫)';
}

function rowsOf(
  results: PairResult[],
  pairs: GoldPair[],
  readings: Map<string, PostReading>,
  mode: StepMode,
): FailureRowB[] {
  return results.flatMap((result): FailureRowB[] => {
    const pair = pairs.find(({ id }) => id === result.id);
    if (pair === undefined) {
      return [];
    }
    if (!result.sameEvent && result.result === 'attached') {
      const cause = result.by === 'ai' ? '모델 판단' : '금지 규칙';
      return [{ id: result.id, failed: `잘못 붙음 (${result.by ?? ''})`, cause }];
    }
    if (result.sameEvent && result.result !== 'attached') {
      return [
        { id: result.id, failed: `못 붙음 (${result.result})`, cause: causeOfTruePair(result, pair, readings, mode) },
      ];
    }
    return [];
  });
}

// An attachment no pair speaks of: a session of a true pair of posts gone to another session of them. It merged two events
// as a false pair does, which no pair's result shows.
function strayAttachments(pairs: GoldPair[], fates: Map<string, SessionFate[]>): FailureRowB[] {
  return [...fates].flatMap(([post, ofPost]) =>
    ofPost.flatMap((fate): FailureRowB[] => {
      const isSpokenOf =
        fate.kind === 'attached' &&
        pairs.some((pair) => {
          const { stored, fresh } = storedAndNew(pair);
          return fresh.post === post && inScope(fresh, fate.number) && isOfSide(fate.to, stored);
        });
      if (fate.kind !== 'attached' || isSpokenOf) {
        return [];
      }
      const cause = fate.by === 'ai' ? '모델 판단' : '금지 규칙';
      return [{ id: `${post} (${fate.number})`, failed: `다른 회차에 붙음 (${fate.by})`, cause }];
    }),
  );
}

// A post that many-to-one pairs share with several others, and every pair it is in.
function groupsOf(pairs: GoldPair[]): GoldPair[][] {
  const manyToOne = pairs.filter(({ chosenAs }) => chosenAs === 'many-to-one');
  const counts = new Map<string, number>();
  for (const { a, b } of manyToOne) {
    counts.set(a.post, (counts.get(a.post) ?? 0) + 1);
    counts.set(b.post, (counts.get(b.post) ?? 0) + 1);
  }
  const hubs = new Set(
    manyToOne.map(({ a, b }) => ((counts.get(a.post) ?? 0) >= (counts.get(b.post) ?? 0) ? a.post : b.post)),
  );
  return [...hubs]
    .filter((hub) => (counts.get(hub) ?? 0) > 1)
    .map((hub) => pairs.filter(({ a, b }) => a.post === hub || b.post === hub));
}

function ratio(k: number, n: number): number | null {
  return n === 0 ? null : k / n;
}

function d2Of(results: PairResult[]): ScoreB['d2'] {
  const tp = results.filter(({ sameEvent, result }) => sameEvent && result === 'attached').length;
  const fp = results.filter(({ sameEvent, result }) => !sameEvent && result === 'attached').length;
  const fn = results.filter(({ sameEvent, result }) => sameEvent && result !== 'attached').length;
  return { tp, fp, fn, precision: ratio(tp, tp + fp), recall: ratio(tp, tp + fn), f1: ratio(2 * tp, 2 * tp + fp + fn) };
}

export async function scoreB(
  pairs: GoldPair[],
  readings: Map<string, PostReading>,
  mode: StepMode,
  ask: AskAboutPost,
): Promise<ScoreB> {
  const fates = new Map<string, SessionFate[]>();
  for (const newPost of newPosts(pairs, readings)) {
    // oxlint-disable-next-line no-await-in-loop -- one call at a time, so that the budget is checked between them
    fates.set(newPost.reading.post.post, await stepOfPost(newPost, mode, ask));
  }
  const results = pairs.map((pair) => pairResult(pair, fates.get(storedAndNew(pair).fresh.post) ?? []));
  const truths = results.filter(({ sameEvent }) => sameEvent);
  const reachedSessions = [...fates.values()].flat();
  const held = reachedSessions.flatMap((fate) => (fate.kind === 'held' ? [fate.heldFor] : []));
  const byHold: Record<string, number> = {};
  for (const hold of held) {
    byHold[hold] = (byHold[hold] ?? 0) + 1;
  }
  const groups = groupsOf(pairs);
  const isRightGroup = (group: GoldPair[]): boolean =>
    group.every(({ id, sameEvent }) => {
      const found = results.find((result) => result.id === id)?.result === 'attached';
      return found === sameEvent;
    });
  const d2 = d2Of(results);
  const strays = strayAttachments(pairs, fates);
  return {
    d1: d2.fp + strays.length,
    d2,
    recallWithQueue: { k: truths.filter(({ result }) => result !== 'none').length, n: truths.length },
    d3: { k: truths.filter(({ reached }) => reached).length, n: truths.length },
    d4: { k: held.length, n: reachedSessions.length, byHold },
    d5: { k: groups.filter((group) => isRightGroup(group)).length, n: groups.length },
    d6: { k: d2.tp, n: truths.length },
    pairs: results,
    rows: [...rowsOf(results, pairs, readings, mode), ...strays],
  };
}
