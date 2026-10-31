/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { existsSync } from 'node:fs';
import {
  COLLECTION_DIRECTORY,
  HARD_NEGATIVE_KINDS,
  LABEL_FILES,
  labelsASchema,
  labelsBSchema,
  placeLabels,
  POSITIVE_KINDS,
  POST_TAGS,
  postsSchema,
  readCollectionFile,
  setASchema,
  setBSchema,
  thresholdsSchema,
} from '../eval/collection/sets.ts';

// The fixed sets of evaluations A and B as committed (P05 ticket 01): what the metrics document and the owner's decisions
// of 2026-10-31 say they hold. It reads the files only, so it passes whether or not the labels have been filled in.

const posts = readCollectionFile('posts.yaml', postsSchema);
const setA = readCollectionFile('set-a.yaml', setASchema);
const setB = readCollectionFile('set-b.yaml', setBSchema);
const thresholds = readCollectionFile('thresholds.yaml', thresholdsSchema);
const aOwner = readCollectionFile(LABEL_FILES.aOwner, labelsASchema);
const aSecond = readCollectionFile(LABEL_FILES.aSecond, labelsASchema);
const bOwner = readCollectionFile(LABEL_FILES.bOwner, labelsBSchema);
const bSecond = readCollectionFile(LABEL_FILES.bSecond, labelsBSchema);

const isPositive = ({ chosenAs }: (typeof setB)[number]): boolean =>
  (POSITIVE_KINDS as readonly string[]).includes(chosenAs);
const isExtra = (post: string): boolean => post.startsWith('extra-');
const sidesOf = ({ a, b }: (typeof setB)[number]): string => [a.post, b.post].toSorted().join(' ');
const ids = (items: { id: string }[]): string[] => items.map(({ id }) => id);

describe('The saved posts', () => {
  it('each post of a set has its record and its HTML', () => {
    const known = new Set(posts.map(({ post }) => post));
    const named = [...setA.map(({ post }) => post), ...setB.flatMap(({ a, b }) => [a.post, b.post])];
    expect(named.filter((post) => !known.has(post))).toEqual([]);
    expect(posts.filter(({ post }) => !existsSync(new URL(`posts/${post}.html`, COLLECTION_DIRECTORY)))).toEqual([]);
  });

  it('holds no post twice', () => {
    expect(new Set(posts.map(({ post }) => post)).size).toBe(posts.length);
  });
});

describe('Evaluation A', () => {
  const heldOut = setA.filter(({ part }) => part === 'held-out');
  const development = setA.filter(({ part }) => part === 'development');

  it('holds out 60 posts, 35 of SNU Now and 25 of extra.snu', () => {
    expect(heldOut).toHaveLength(60);
    expect(heldOut.filter(({ post }) => isExtra(post))).toHaveLength(25);
  });

  it("develops on the metrics document's 18 posts, none of them held out", () => {
    expect(development).toHaveLength(18);
    const held = new Set(heldOut.map(({ post }) => post));
    expect(development.filter(({ post }) => held.has(post))).toEqual([]);
  });

  it('holds each kind of post it was built to hold', () => {
    const tags = new Set(heldOut.flatMap((item) => item.tags));
    expect(POST_TAGS.filter((tag) => !tags.has(tag))).toEqual([]);
  });
});

describe('Evaluation B', () => {
  it('holds 120 pairs, 30 to 50% of them expected to be the same event', () => {
    expect(setB).toHaveLength(120);
    const positives = setB.filter((pair) => isPositive(pair)).length;
    expect(positives).toBeGreaterThanOrEqual(36);
    expect(positives).toBeLessThanOrEqual(60);
  });

  it('holds every kind of positive and hard negative', () => {
    const kinds = new Set(setB.map(({ chosenAs }) => chosenAs));
    expect([...POSITIVE_KINDS, ...HARD_NEGATIVE_KINDS].filter((kind) => !kinds.has(kind))).toEqual([]);
  });

  it('holds no pair twice', () => {
    const key = ({ a, b }: (typeof setB)[number]): string =>
      [`${a.post}#${a.session}`, `${b.post}#${b.session}`].toSorted().join(' ');
    expect(new Set(setB.map((pair) => key(pair))).size).toBe(setB.length);
  });
});

describe('The parts of evaluation B', () => {
  const heldOut = setB.filter(({ part }) => part === 'held-out');
  const development = setB.filter(({ part }) => part === 'development');

  it('holds the trap 177707 against PGM012002382 out, with the true pairs of both', () => {
    const traps = setB.filter(({ trap }) => trap);
    expect(traps.map((pair) => sidesOf(pair))).toEqual(['extra-PGM012002382 snu-177707']);
    expect(traps[0].part).toBe('held-out');
    const pairsHeldOut = heldOut.map((pair) => sidesOf(pair));
    expect(pairsHeldOut).toContain('extra-PGM012002381 snu-177707');
    expect(pairsHeldOut).toContain('extra-PGM012002382 snu-178079');
  });

  it('sets aside about a fifth for development', () => {
    expect(development.length).toBeGreaterThanOrEqual(20);
    expect(development.length).toBeLessThanOrEqual(30);
  });

  it('shares no post between development and the held-out part', () => {
    const held = new Set(heldOut.flatMap(({ a, b }) => [a.post, b.post]));
    expect(development.flatMap(({ a, b }) => [a.post, b.post]).filter((post) => held.has(post))).toEqual([]);
  });

  it('develops on none of the held-out posts of evaluation A', () => {
    const held = new Set(setA.filter(({ part }) => part === 'held-out').map(({ post }) => post));
    expect(development.flatMap(({ a, b }) => [a.post, b.post]).filter((post) => held.has(post))).toEqual([]);
  });
});

describe('The order of the pairs of evaluation B', () => {
  it('says nothing: each source comes first in both positives and hard negatives', () => {
    for (const pairs of [setB.filter((pair) => isPositive(pair)), setB.filter((pair) => !isPositive(pair))]) {
      expect(new Set(pairs.map(({ a }) => isExtra(a.post))).size).toBe(2);
    }
  });
});

describe('The label files', () => {
  it("the owner's cover every item, in order", () => {
    expect(ids(aOwner.items)).toEqual(ids(setA));
    expect(ids(bOwner.items)).toEqual(ids(setB));
  });

  it('the second labeller has 15 held-out posts of A', () => {
    const heldOut = new Set(ids(setA.filter(({ part }) => part === 'held-out')));
    expect(aSecond.items).toHaveLength(15);
    expect(ids(aSecond.items).filter((id) => !heldOut.has(id))).toEqual([]);
  });

  it('the second labeller has 30 held-out hard negatives of B', () => {
    const hardNegatives = new Set(ids(setB.filter((pair) => !isPositive(pair) && pair.part === 'held-out')));
    expect(bSecond.items).toHaveLength(30);
    expect(ids(bSecond.items).filter((id) => !hardNegatives.has(id))).toEqual([]);
  });

  it('a filled-in place is a row of labels/places.tsv or none', () => {
    const places = placeLabels();
    const given = [...aOwner.items, ...aSecond.items].flatMap(({ sessions }) => sessions.map(({ place }) => place));
    expect(given.filter((place) => place !== null && place !== 'none' && !places.has(place))).toEqual([]);
  });
});

describe('The thresholds', () => {
  it('cover C1–C7 and D1–D6', () => {
    const covered = new Set(thresholds.thresholds.map(({ metric }) => metric));
    const expected = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6'];
    expect(expected.filter((metric) => !covered.has(metric))).toEqual([]);
  });

  it('a floor for each of C1–C7 and D1, which the metrics document gives', () => {
    const floors = new Set(thresholds.thresholds.filter(({ kind }) => kind === 'floor').map(({ metric }) => metric));
    expect([...floors].toSorted()).toEqual(['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'D1']);
  });

  it('a value and a comparator for each floor and target, and no id twice', () => {
    const judged = thresholds.thresholds.filter(({ kind }) => kind !== 'diagnostic');
    expect(judged.filter(({ comparator, value }) => comparator === undefined || value === undefined)).toEqual([]);
    expect(new Set(ids(thresholds.thresholds)).size).toBe(thresholds.thresholds.length);
  });

  it('a missed floor of C2, C3 or D1 stops automatic publication', () => {
    expect(thresholds.whenAFloorIsMissed.stopsAutomaticPublication).toEqual(['C2', 'C3', 'D1']);
  });
});
