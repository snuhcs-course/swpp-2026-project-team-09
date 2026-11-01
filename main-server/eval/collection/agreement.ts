/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type LabelsA, type LabelsB } from './sets.ts';

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

type ItemA = LabelsA['items'][number];
type Session = ItemA['sessions'][number];

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

// Both answers to one field of each session. A session one labeller read and the other did not disagrees on the field.
function sessionPairs<Label>(
  items: [ItemA, ItemA][],
  field: (session: Session) => Label | null,
  unread: (answer: Label) => Label,
): [Label, Label][] {
  return items.flatMap(([own, other]) => {
    const numbers = new Set([...own.sessions, ...other.sessions].map(({ n }) => n));
    return filled(
      [...numbers].map((number): [Label | null, Label | null] => {
        const first = own.sessions.find(({ n }) => n === number);
        const second = other.sessions.find(({ n }) => n === number);
        if (first === undefined || second === undefined) {
          const one = first ?? second;
          const read = one === undefined ? null : field(one);
          return read === null ? [null, null] : first === undefined ? [unread(read), read] : [read, unread(read)];
        }
        return [field(first), field(second)];
      }),
    );
  });
}

export interface PostAgreement {
  announcesEvent: YesNoAgreement;
  start: Agreement;
  end: Agreement;
  place: Agreement;
  overPeriod: YesNoAgreement;
  mayPublish: YesNoAgreement;
}

export function agreementOnPosts(owner: LabelsA, second: LabelsA): PostAgreement {
  const items = pairedItems(owner, second);
  const text = (field: (session: Session) => string | null): Agreement =>
    agreementOf(sessionPairs(items, field, (answer) => `not ${answer}`));
  const yesNo = (field: (session: Session) => boolean | null): YesNoAgreement =>
    yesNoAgreementOf(sessionPairs(items, field, (answer) => !answer));
  return {
    announcesEvent: yesNoAgreementOf(
      filled(items.map(([own, other]): [boolean | null, boolean | null] => [own.announcesEvent, other.announcesEvent])),
    ),
    start: text(({ start }) => start),
    end: text(({ end }) => end),
    place: text(({ place }) => place),
    overPeriod: yesNo(({ overPeriod }) => overPeriod),
    mayPublish: yesNo(({ mayPublish }) => mayPublish),
  };
}

export function agreementOnPairs(owner: LabelsB, second: LabelsB): YesNoAgreement {
  return yesNoAgreementOf(
    filled(
      second.items.map(({ id, sameEvent }): [boolean | null, boolean | null] => [
        owner.items.find((item) => item.id === id)?.sameEvent ?? null,
        sameEvent,
      ]),
    ),
  );
}
