/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { readFileSync } from 'node:fs';
import { z } from 'zod';
import { casesIn, loadCases } from '../eval/cases.ts';
import { generateWorld, RESERVED_LECTURE_DAY } from '../eval/p5/large-world/generate.ts';
import { contextPosts } from '../eval/p5/large-world/context-posts.ts';
import { positionsFromSeed, readWordings } from '../eval/p5/large-world/wordings.ts';
import { SAMPLE_SEED, wordingsSample } from '../eval/p5/large-world/wordings-sample.ts';
import { traps } from '../eval/p5/large-world/traps.ts';
import {
  directoryOf,
  intendedCalls,
  LARGE_WORLD,
  largeWorldData,
  sha256Of,
} from '../eval/p5/large-world/world-data.ts';
import { caseOfTag, p5Suite, type Suite } from '../eval/p5/report.ts';

// The large world's files and what reads them (P05 ticket 02b), with no app and no model. The world is the file: a test
// here pins it by its hash, so that any change to it or its answers has to become a new version.

const world = largeWorldData();
const cases = casesIn(loadCases(), LARGE_WORLD);
const intended = intendedCalls();
const suite = p5Suite();
const large = suite.largeWorld;
if (large === undefined) {
  throw new Error('The suite holds no large world');
}
const pinned = z.looseObject({ version: z.string(), worldSha256: z.string(), casesSha256: z.string() }).parse(large);

const cardsOf = (evalCase: (typeof cases)[number]): string[] =>
  (evalCase.expect?.cards ?? []).flatMap(({ seeds }) => seeds);

const campusMap = (): unknown =>
  JSON.parse(readFileSync(new URL('../seed/campus-map-places.json', import.meta.url), 'utf8'));

describe('The data file of the large world', () => {
  it('is the version the suite pins, by its hashes', () => {
    const directory = directoryOf(LARGE_WORLD);

    expect(pinned.version).toBe(LARGE_WORLD);
    expect(sha256Of(new URL('world.json', directory))).toBe(pinned.worldSha256);
    expect(sha256Of(new URL('cases/search.yaml', directory))).toBe(pinned.casesSha256);
  });

  it('holds about 1,000 Quests and a few hundred Global Events, each under a name of its own', () => {
    const keys = [...world.quests, ...world.globalEvents].map(({ key }) => key);

    expect(world.quests.length).toBeGreaterThanOrEqual(900);
    expect(world.quests.length).toBeLessThanOrEqual(1100);
    expect(world.globalEvents.length).toBeGreaterThanOrEqual(200);
    expect(world.globalEvents.length).toBeLessThanOrEqual(400);
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe('What the data file holds', () => {
  it('holds no more Holders than a Quest has room for, and no more for an event than it has people', () => {
    const forEvent = new Map<string, number>();
    for (const quest of world.quests) {
      if ('globalEvent' in quest) {
        forEvent.set(quest.globalEvent, (forEvent.get(quest.globalEvent) ?? 0) + quest.holders);
      }
    }

    expect(world.quests.filter(({ holders, capacity }) => holders > capacity)).toEqual([]);
    expect([...forEvent.values()].filter((holders) => holders > world.people.length)).toEqual([]);
  });

  it('names only Global Events it holds, and marks as started what starts before its clock', () => {
    const events = new Map(world.globalEvents.map((event) => [event.key, event]));
    const clock = Date.parse(`${world.now}+09:00`);
    const startOf = (quest: (typeof world.quests)[number]): string | undefined =>
      'globalEvent' in quest ? events.get(quest.globalEvent)?.starts : quest.starts;

    expect(world.quests.filter((quest) => startOf(quest) === undefined)).toEqual([]);
    expect(
      world.quests.filter((quest) => Date.parse(`${startOf(quest) ?? ''}+09:00`) < clock !== quest.started),
    ).toEqual([]);
  });

  it('puts nothing on the ends of the parts of the day, which the rules leave open, and only its traps on 11-06 특강', () => {
    const atEdge = world.quests.filter(
      (quest) => 'starts' in quest && !('trap' in quest) && /T(?:11|16|22):00$/u.test(quest.starts),
    );
    const lectures = world.globalEvents.filter(
      ({ activity, starts, trap }) =>
        activity === 'lecture' && starts.startsWith(RESERVED_LECTURE_DAY) && trap === undefined,
    );

    expect(atEdge).toEqual([]);
    expect(lectures).toEqual([]);
  });
});

describe('The record of the wordings check', () => {
  const check = z
    .object({
      sample: z.object({ seed: z.number(), size: z.number() }),
      checkedBy: z.string(),
      checkedOn: z.string(),
      items: z.array(z.object({ id: z.string(), wording: z.string(), verdict: z.enum(['ok', 'fix', 'drop']) })),
    })
    .parse(JSON.parse(readFileSync(new URL('wordings-check.json', directoryOf(LARGE_WORLD)), 'utf8')));

  it('holds a verdict for each wording of the sample, as the wordings have them now', () => {
    const sample = wordingsSample();

    expect(check.sample).toEqual({ seed: SAMPLE_SEED, size: sample.length });
    expect(check.items.map(({ id, wording }) => ({ id, wording }))).toEqual(
      sample.map(({ id, wording }) => ({ id, wording })),
    );
  });

  it('leaves no wording the owner took out or changed', () => {
    expect(check.items.filter(({ verdict }) => verdict !== 'ok')).toEqual([]);
  });
});

describe('The titles of the data file', () => {
  it('takes its generated titles only from the wordings, and adds the traps as written', () => {
    const wordings = readWordings();
    const { quests: handQuests, globalEvents } = traps();
    const quests = [...handQuests, ...contextPosts()];
    const questTitles = new Set(
      Object.values(wordings.activities).flatMap(({ quest }) => quest.titles.concat(quest.typos)),
    );
    const trapKeys = new Set([...quests, ...globalEvents].map(({ key }) => key));

    expect(world.quests.filter(({ key, title }) => !trapKeys.has(key) && !questTitles.has(title))).toEqual([]);
    expect(quests.map(({ key }) => key).filter((key) => !world.quests.some((quest) => quest.key === key))).toEqual([]);
    expect(
      globalEvents.map(({ key }) => key).filter((key) => !world.globalEvents.some((event) => event.key === key)),
    ).toEqual([]);
  });
});

describe('The generator', () => {
  it('makes the same world each time from the same seed', () => {
    const wordings = readWordings();
    const positions = positionsFromSeed(wordings, campusMap());

    expect(generateWorld('a', 7, wordings, positions)).toEqual(generateWorld('a', 7, wordings, positions));
  });

  it('makes another world from another seed', () => {
    const wordings = readWordings();
    const positions = positionsFromSeed(wordings, campusMap());

    expect(generateWorld('a', 7, wordings, positions).quests).not.toEqual(
      generateWorld('a', 8, wordings, positions).quests,
    );
  });
});

describe('The cases of the large world', () => {
  it('each name that world and repeat 3 times, none of them live', () => {
    expect(cases.length).toBeGreaterThan(0);
    expect(cases.filter(({ repeat, live }) => repeat !== 3 || live)).toEqual([]);
  });

  it('expect exact sets of at most 20 cards, of things the world holds', () => {
    const keys = new Set([...world.quests, ...world.globalEvents].map(({ key }) => key));
    const groups = cases.flatMap(({ id, expect: written }) =>
      (written?.cards ?? []).map(({ kind, seeds, max }) => ({ id, kind, seeds: seeds.length, max })),
    );

    expect(groups.filter(({ seeds, max }) => max !== seeds)).toEqual([]);
    expect(cases.filter((evalCase) => cardsOf(evalCase).length > 20).map(({ id }) => id)).toEqual([]);
    expect(cases.flatMap((evalCase) => cardsOf(evalCase)).filter((card) => !keys.has(card))).toEqual([]);
  });

  it('leave the small world’s cases as they were', () => {
    expect(casesIn(loadCases(), 'p5').filter(({ id }) => id.startsWith('large-'))).toEqual([]);
    expect(cases.filter(({ id }) => !id.startsWith('large-'))).toEqual([]);
  });

  it('each have their intended calls, and only those', () => {
    expect(intended.map(({ case: id }) => id)).toEqual(cases.map(({ id }) => id));
  });
});

const tagged = (tag: string): Set<string> => new Set((large.tags[tag] ?? []).map((one) => caseOfTag(one)));

const entriesOf = (metric: string, of: Suite['thresholds']): object[] =>
  of.filter((one) => one.metric === metric).map(({ kind, comparator, value }) => ({ kind, comparator, value }));

describe('The large world in the suite', () => {
  it.each(['L', 'P', 'T1', 'T2', 'H', 'S', 'N', 'R', 'O', 'B', 'V', 'C'])(
    'holds at least five cases of subset %s',
    (subset) => {
      expect(tagged(subset).size).toBeGreaterThanOrEqual(5);
    },
  );

  it('holds six cases of subset E, every one with an empty answer', () => {
    expect(tagged('E').size).toBe(6);
    expect(cases.filter(({ id }) => tagged('E').has(id)).filter((evalCase) => cardsOf(evalCase).length > 0)).toEqual(
      [],
    );
  });

  it('tags every case once, by the seeds of its answer', () => {
    const tags = Object.values(large.tags).flat();
    const seedsOf = (id: string): string[] =>
      tags
        .filter((tag) => caseOfTag(tag) === id)
        .map((tag) => (typeof tag === 'string' ? '' : String(tag.seed)))
        .toSorted();

    expect(
      cases.flatMap((evalCase) => {
        const cards = cardsOf(evalCase);
        const written = (cards.length === 0 ? ['null'] : cards).toSorted();
        return JSON.stringify(seedsOf(evalCase.id)) === JSON.stringify(written) ? [] : [evalCase.id];
      }),
    ).toEqual([]);
  });

  it('commits the thresholds of evaluation D but E6, as the small world has them', () => {
    for (const metric of ['E1', 'E2', 'E3', 'E4', 'E5', 'E7', 'E8']) {
      expect([metric, entriesOf(metric, large.thresholds)]).toEqual([metric, entriesOf(metric, suite.thresholds)]);
    }
    expect(entriesOf('E9', large.thresholds)).toEqual([{ kind: 'target', comparator: '>=', value: 0.8 }]);
    expect(new Set(large.thresholds.map(({ metric }) => metric)).size).toBe(8);
  });

  it('leaves the small world its own tags and thresholds', () => {
    expect(suite.tags.V).toEqual([]);
    expect(suite.thresholds.filter(({ metric }) => metric.startsWith('J')).length).toBeGreaterThan(0);
  });
});
