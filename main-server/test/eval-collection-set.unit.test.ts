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
  read,
  setASchema,
  setBSchema,
  thresholdsSchema,
} from '../eval/collection/sets.ts';

// The fixed sets of evaluations A and B as committed (P05 ticket 01): what the metrics document and the owner's decisions
// of 2026-10-31 say they hold. It reads the files only, so it passes whether or not the labels have been filled in.

const posts = read('posts.yaml', postsSchema);
const setA = read('set-a.yaml', setASchema);
const setB = read('set-b.yaml', setBSchema);
const thresholds = read('thresholds.yaml', thresholdsSchema);
const aOwner = read(LABEL_FILES.aOwner, labelsASchema);
const aSecond = read(LABEL_FILES.aSecond, labelsASchema);
const bOwner = read(LABEL_FILES.bOwner, labelsBSchema);
const bSecond = read(LABEL_FILES.bSecond, labelsBSchema);

const isPositive = ({ chosenAs }: (typeof setB)[number]): boolean =>
  (POSITIVE_KINDS as readonly string[]).includes(chosenAs);
const isExtra = (post: string): boolean => post.startsWith('extra-');
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
  const heldOut = setB.filter(({ part }) => part === 'held-out');
  const development = setB.filter(({ part }) => part === 'development');

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

  it('holds the trap 177707 against PGM012002382 out, with the true pairs of both', () => {
    const trap = setB.find(({ trap: isTrap }) => isTrap);
    expect(trap).toMatchObject({ a: { post: 'snu-177707' }, b: { post: 'extra-PGM012002382' }, part: 'held-out' });
    const pairsHeldOut = heldOut.map(({ a, b }) => `${a.post} ${b.post}`);
    expect(pairsHeldOut).toContain('snu-177707 extra-PGM012002381');
    expect(pairsHeldOut).toContain('snu-178079 extra-PGM012002382');
  });

  it('sets aside about a fifth for development', () => {
    expect(development.length).toBeGreaterThanOrEqual(20);
    expect(development.length).toBeLessThanOrEqual(30);
  });

  it('keeps the posts of one many-to-one group in one part', () => {
    const parts = new Map<string, Set<string>>();
    for (const { a, chosenAs, part } of setB) {
      if (chosenAs === 'many-to-one') {
        parts.set(a.post, (parts.get(a.post) ?? new Set()).add(part));
      }
    }
    expect([...parts.entries()].filter(([, seen]) => seen.size > 1)).toEqual([]);
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
