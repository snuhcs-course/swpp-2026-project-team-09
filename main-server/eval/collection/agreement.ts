/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { labelsASchema, labelsBSchema } from './sets.ts';

// How far two labellers agree (metrics document, 4.4): the observed agreement p_o, Cohen's κ and, for a yes-or-no label,
// the positive and negative agreement apart, since κ runs low when one answer is rare. A pair of labels is an answer
// from each, over the items both filled in.

export interface Agreement {
  n: number;
  observed: number | null;
  // Null when the labels leave no room for chance: everyone gave one same answer, as hard negatives may.
  kappa: number | null;
}

export interface YesNoAgreement extends Agreement {
  bothYes: number;
  bothNo: number;
  oneOfEach: number;
  positive: number | null;
  negative: number | null;
}

function ratio(top: number, bottom: number): number | null {
  return bottom === 0 ? null : top / bottom;
}

export function agreementOf<Label>(pairs: [Label, Label][]): Agreement {
  const n = pairs.length;
  const agreeing = pairs.filter(([first, second]) => first === second).length;
  const observed = ratio(agreeing, n);
  const answers = new Set(pairs.flat());
  const share = (index: 0 | 1, answer: Label): number => pairs.filter((pair) => pair[index] === answer).length / n;
  const chance = [...answers].reduce((sum, answer) => sum + share(0, answer) * share(1, answer), 0);
  return { n, observed, kappa: observed === null || chance === 1 ? null : (observed - chance) / (1 - chance) };
}

export function yesNoAgreementOf(pairs: [boolean, boolean][]): YesNoAgreement {
  const bothYes = pairs.filter(([first, second]) => first && second).length;
  const bothNo = pairs.filter(([first, second]) => !first && !second).length;
  const oneOfEach = pairs.length - bothYes - bothNo;
  return {
    ...agreementOf(pairs),
    bothYes,
    bothNo,
    oneOfEach,
    positive: ratio(2 * bothYes, 2 * bothYes + oneOfEach),
    negative: ratio(2 * bothNo, 2 * bothNo + oneOfEach),
  };
}

type LabelsA = z.infer<typeof labelsASchema>;
type LabelsB = z.infer<typeof labelsBSchema>;
type ItemA = LabelsA['items'][number];
type Session = ItemA['sessions'][number];

const SESSION_FIELDS = ['start', 'end', 'place', 'overPeriod', 'mayPublish'] as const;

// Both answers to an item both labellers have filled in.
function filled<Label>(pairs: [Label | null, Label | null][]): [Label, Label][] {
  return pairs.filter((pair): pair is [Label, Label] => pair[0] !== null && pair[1] !== null);
}

function pairedItems(owner: LabelsA, second: LabelsA): [ItemA, ItemA][] {
  return second.items.flatMap((item) => {
    const own = owner.items.find(({ id }) => id === item.id);
    return own === undefined ? [] : [[own, item] as [ItemA, ItemA]];
  });
}

// The answer a labeller gave, or that they did not read the session.
type SessionAnswer = string | boolean | null;

const NO_SESSION = 'no session';

// A session one labeller read and the other did not disagrees on every field.
function sessionFieldPairs(
  items: [ItemA, ItemA][],
  field: (typeof SESSION_FIELDS)[number],
): [SessionAnswer, SessionAnswer][] {
  return items.flatMap(([own, other]) => {
    const numbers = new Set([...own.sessions, ...other.sessions].map(({ n }) => n));
    return [...numbers].map((number): [SessionAnswer, SessionAnswer] => {
      const answer = (sessions: Session[]): SessionAnswer => {
        const session = sessions.find(({ n }) => n === number);
        return session === undefined ? NO_SESSION : session[field];
      };
      return [answer(own.sessions), answer(other.sessions)];
    });
  });
}

export function agreementOnPosts(owner: LabelsA, second: LabelsA): Record<string, Agreement> {
  const items = pairedItems(owner, second);
  return {
    announcesEvent: yesNoAgreementOf(
      filled(
        items.map(([own, other]) => [own.announcesEvent, other.announcesEvent] as [boolean | null, boolean | null]),
      ),
    ),
    ...Object.fromEntries(SESSION_FIELDS.map((field) => [field, agreementOf(filled(sessionFieldPairs(items, field)))])),
  };
}

export function agreementOnPairs(owner: LabelsB, second: LabelsB): YesNoAgreement {
  return yesNoAgreementOf(
    filled(
      second.items.map(({ id, sameEvent }) => {
        const own = owner.items.find((item) => item.id === id);
        return [own?.sameEvent ?? null, sameEvent] as [boolean | null, boolean | null];
      }),
    ),
  );
}
