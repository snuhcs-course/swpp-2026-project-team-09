/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type Prisma, SessionAttachment, SessionHold } from '../generated/prisma/client.js';
import {
  AI_TERMS_WITHOUT_PLACE,
  candidatesLeft,
  type ComparedSession,
  matchAmong,
  normalisedTitle,
  sameEventCandidates,
  TITLE_RULE,
  TITLE_RULE_WITHOUT_PLACE,
} from './same-event.js';
import { appliedChoice, type CandidateEvent } from './same-event-choice.js';

// What the step makes of a session against the events that exist: the title rule, then the answer the AI gave.

const A_MINUTE = 60 * 1000;

// What the settings let the step do. Each may be off while the step still runs.
export interface StepSwitches {
  publishes: boolean;
  comparesTitles: boolean;
  choosesByAi: boolean;
}

// What the comparison says of a session. To attach, also how, and the start of the event it goes to.
export type Compared =
  | { kind: 'own' }
  | { kind: 'hold'; heldFor: SessionHold }
  | {
      kind: 'attach';
      globalEventId: string;
      reason: string | null;
      attachedBy: SessionAttachment;
      target: Date;
    };

export const OWN: Compared = { kind: 'own' };
const SEVERAL: Compared = { kind: 'hold', heldFor: SessionHold.several_matches };
const UNCHECKED: Compared = { kind: 'hold', heldFor: SessionHold.place_unchecked };

// Whether the AI's choice may attach a session whose place failed the checks (ADR 0014): the starts are equal to the
// minute, and one normalised title holds the other.
export function attachesWithoutPlace(session: ComparedSession, chosen: ComparedSession): boolean {
  const [title, other] = [normalisedTitle(session.title), normalisedTitle(chosen.title)];
  return (
    Math.floor(session.startsAt.getTime() / A_MINUTE) === Math.floor(chosen.startsAt.getTime() / A_MINUTE) &&
    (title.includes(other) || other.includes(title))
  );
}

// One event cannot take two sessions of a post, whichever way each came to it.
async function holdsOneOf(tx: Prisma.TransactionClient, sourcePostId: string, globalEventId: string): Promise<boolean> {
  return (await tx.sourcePostSession.count({ where: { sourcePostId, globalEventId } })) > 0;
}

interface Comparison {
  session: ComparedSession;
  sourcePostId: string;
  events: CandidateEvent[];
  publishable: boolean;
}

// The answer the AI gave for the candidates the rules left.
async function chosenByAi(
  tx: Prisma.TransactionClient,
  { session, sourcePostId, events, publishable }: Comparison,
): Promise<Compared> {
  const left = candidatesLeft(session, events);
  const stored = await tx.sameEventAnswer.findUnique({
    where: { sourcePostId_startsAt: { sourcePostId, startsAt: session.startsAt } },
  });
  // With no answer, any candidate left is one the AI was not asked about, also when the title rule decided at the asking
  // and no longer does: D4 counts it as `candidates_changed`. Asked about none and none has come. With an answer, a chosen event that has gone must not make the session its own.
  if (stored === null && left.length === 0) {
    return OWN;
  }
  const applied = appliedChoice(
    stored,
    left.map(({ id }) => id),
  );
  if (applied.kind === 'hold') {
    return applied;
  }
  const chosen = applied.kind === 'attach' ? events.find(({ id }) => id === applied.globalEventId) : undefined;
  if (!publishable && (chosen === undefined || !attachesWithoutPlace(session, chosen))) {
    return UNCHECKED;
  }
  if (applied.kind !== 'attach') {
    return applied;
  }
  const reason = publishable ? applied.reason : AI_TERMS_WITHOUT_PLACE;
  const target = chosen?.startsAt ?? session.startsAt;
  return (await holdsOneOf(tx, sourcePostId, applied.globalEventId))
    ? SEVERAL
    : { ...applied, reason, attachedBy: SessionAttachment.ai, target };
}

// The rules, then the answer the AI gave for the candidates they left. With both switches off nothing is looked at. A
// session that may not be published is attached only on ADR 0014's terms, and held where one that may would be its own.
export async function compared(
  tx: Prisma.TransactionClient,
  session: ComparedSession,
  sourcePostId: string,
  { comparesTitles, choosesByAi }: StepSwitches,
  publishable = true,
): Promise<Compared> {
  if (!comparesTitles && !choosesByAi) {
    return OWN;
  }
  const events = await sameEventCandidates(tx, session.startsAt, sourcePostId);
  const match = comparesTitles ? matchAmong(session, events) : { kind: 'none' as const };
  if (match.kind === 'one') {
    const { globalEventId } = match;
    // With the AI off this stays as 08a left it, for the runs before the AI's to compare.
    if (choosesByAi && (await holdsOneOf(tx, sourcePostId, globalEventId))) {
      return SEVERAL;
    }
    const target = events.find((event) => event.id === globalEventId)?.startsAt ?? session.startsAt;
    const reason = publishable ? TITLE_RULE : TITLE_RULE_WITHOUT_PLACE;
    return { kind: 'attach', globalEventId, reason, attachedBy: SessionAttachment.rule, target };
  }
  if (match.kind === 'several') {
    return SEVERAL;
  }
  return choosesByAi ? chosenByAi(tx, { session, sourcePostId, events, publishable }) : OWN;
}
