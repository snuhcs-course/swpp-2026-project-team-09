/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import { inject } from 'vitest';
import { type EvalCase, loadCases } from '../eval/cases.ts';
import { type Expect } from '../eval/expect.ts';
import { type Seeded, seedWorld, type World } from '../eval/world.ts';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { NOW } from '../eval/runner.ts';
import { ask, postAssistantMessages } from './assistant.js';
import { createDatabase, seed } from './containers.js';
import { refuseMatchServer } from './match-server.js';
import { ScriptedModel } from './scripted-model.js';
import { startApp } from './start-app.js';
import { refuseKakao } from './walking-route.js';

// The benchmark's cases (P19 ticket 03), without a model: every case file loads and fits the case schema, the set is
// the spec's, and every seed name a case gives is something of that kind in the world, seeded into a database of its
// own so that it reaches no other test.

// The spec's categories and their counts ("Cases").
const CATEGORIES: Record<string, number> = {
  menus: 5,
  shuttle: 3,
  'global-events': 5,
  'finding-parties': 5,
  'making-parties': 7,
  'missing-or-ambiguous-target': 8,
  'ambiguous-intent': 4,
  'no-data': 4,
  'out-of-scope': 4,
  'small-talk': 3,
  'follow-ups': 6,
  live: 3,
  compound: 5,
};

// A seed name a case gives, and the kind of thing it must be.
interface SeedRef {
  kind: Seeded['kind'];
  name: string;
}

// The seed names of an `expect`: its cards, its Proposal and the id fields of its arguments.
function refsOfExpect(expected: Expect): SeedRef[] {
  const refs: SeedRef[] = (expected.cards ?? []).flatMap(({ kind, seeds }) => seeds.map((name) => ({ kind, name })));
  const { place, globalEvent, invitees } = expected.proposal ?? {};
  refs.push(
    ...(typeof place === 'string' ? [{ kind: 'place' as const, name: place }] : []),
    ...(typeof globalEvent === 'string' ? [{ kind: 'globalEvent' as const, name: globalEvent }] : []),
    ...(invitees ?? []).map((name) => ({ kind: 'friend' as const, name })),
  );
  for (const [tool, written] of Object.entries(expected.args)) {
    for (const args of Array.isArray(written) ? written : [written]) {
      if (typeof args.globalEvent === 'string') {
        refs.push({ kind: 'globalEvent', name: args.globalEvent });
      }
      if (tool === 'proposeQuest' && typeof args.place === 'string') {
        refs.push({ kind: 'place', name: args.place });
      }
      if (tool === 'proposeQuest' && Array.isArray(args.invitees)) {
        refs.push(...args.invitees.map((name) => ({ kind: 'friend' as const, name: String(name) })));
      }
    }
  }
  return refs;
}

// Every seed name of a case: those of its expectations and of the Assistant's turns it writes out.
function refsOf(evalCase: EvalCase): SeedRef[] {
  return [
    ...(evalCase.expect === undefined ? [] : refsOfExpect(evalCase.expect)),
    ...evalCase.turns.flatMap((turn): SeedRef[] => {
      if ('user' in turn) {
        return turn.expect === undefined ? [] : refsOfExpect(turn.expect);
      }
      const { cards, proposal } = turn.assistant;
      return [
        ...cards.map((card) => ({ kind: card.kind, name: card.seed })),
        ...(typeof proposal?.place === 'string' ? [{ kind: 'place' as const, name: proposal.place }] : []),
        ...(typeof proposal?.globalEvent === 'string'
          ? [{ kind: 'globalEvent' as const, name: proposal.globalEvent }]
          : []),
        ...(proposal?.invitees ?? []).map((name) => ({ kind: 'friend' as const, name })),
      ];
    }),
  ];
}

// The expectations a case scores: its own, and a live case's turns'.
function expectsOf(evalCase: EvalCase): Expect[] {
  return [
    ...(evalCase.expect === undefined ? [] : [evalCase.expect]),
    ...evalCase.turns.flatMap((turn) => ('user' in turn && turn.expect !== undefined ? [turn.expect] : [])),
  ];
}

const cases = loadCases();

// 학관 as a word of its own, not the end of 공학관 or 약학관.
const ABBREVIATION = /(?<![가-힣])학관/u;

function inCategory(category: string): EvalCase[] {
  return cases.filter((evalCase) => evalCase.category === category);
}

// The accepted actions of every expectation in a category.
function actionsIn(category: string): string[][] {
  return inCategory(category).flatMap((evalCase) => expectsOf(evalCase).map((expected) => expected.actions));
}

describe('The case files', () => {
  it("hold the spec's 62 cases, in its 13 categories and counts", () => {
    const counts = Object.fromEntries(Object.keys(CATEGORIES).map((category) => [category, 0]));
    for (const { category } of cases) {
      counts[category] = (counts[category] ?? 0) + 1;
    }
    expect(counts).toEqual(CATEGORIES);
    expect(cases).toHaveLength(62);
  });

  it('give every case an expectation for the turn it scores', () => {
    for (const evalCase of cases) {
      const last = evalCase.turns.at(-1);
      const scored = evalCase.expect ?? (last !== undefined && 'user' in last ? last.expect : undefined);
      expect(scored, evalCase.id).toBeDefined();
    }
  });

  it('run 3 cases live, every other follow-up from a fixed history, and about 5 cases three times', () => {
    expect(cases.filter(({ live }) => live).map(({ category }) => category)).toEqual(['live', 'live', 'live']);
    expect(inCategory('follow-ups').every(({ live, turns }) => !live && turns.length > 1)).toBe(true);
    expect(cases.filter(({ repeat }) => repeat === 3)).toHaveLength(5);
  });

  it('expect TOOL+ASK only of the ambiguous-intent cases, REFUSE of the out-of-scope ones and CHAT of small talk', () => {
    expect(new Set(actionsIn('ambiguous-intent').map(String))).toEqual(new Set(['TOOL+ASK']));
    expect(new Set(actionsIn('out-of-scope').map(String))).toEqual(new Set(['REFUSE']));
    expect(new Set(actionsIn('small-talk').map(String))).toEqual(new Set(['CHAT']));
  });

  it('mark every ambiguous-intent case a known failure, and name 학생회관 in full there', () => {
    for (const evalCase of inCategory('ambiguous-intent')) {
      expect(evalCase.knownFailure, evalCase.id).toBeDefined();
      expect(JSON.stringify(evalCase.turns), evalCase.id).not.toMatch(ABBREVIATION);
    }
  });

  it('write "학관" only in cases that are known failures', () => {
    const abbreviated = cases.filter(({ turns }) =>
      turns.some((turn) => 'user' in turn && ABBREVIATION.test(turn.user)),
    );
    expect(abbreviated.length).toBeGreaterThan(0);
    expect(abbreviated.every(({ knownFailure }) => knownFailure !== undefined)).toBe(true);
  });
});

// What the cases' right answers rest on, each a tool, its input, and words its answer holds and lacks, so that a change
// to the world that breaks a case is seen here.
const WORLD_FACTS: [string, object, string[], string[]][] = [
  ['resolveFriend', { name: '민수' }, ['"several"', '이민수', '김민수'], []],
  ['resolveFriend', { name: '서준' }, ['"several"', '박서준'], []],
  ['resolveFriend', { name: '박지훈' }, ['"none"'], []],
  ['resolvePlace', { words: '학생회관' }, ['"one"', '학생회관'], []],
  ['resolvePlace', { words: '301동' }, ['"one"', '제1공학관'], []],
  ['resolvePlace', { words: '학관' }, ['"several"'], ['"학생회관"']],
  ['resolvePlace', { words: '공학관' }, ['"several"'], []],
  ['resolveGlobalEvent', { words: '축제' }, ['"several"', '관악 가을 축제', '축제 개막 공연'], []],
  ['getMenus', { date: '2026-10-21', meal: 'lunch' }, ['"found"', '제육볶음'], []],
  ['getMenus', { date: '2026-10-23' }, ['"none"'], []],
  ['getMenus', { date: '2026-10-22', meal: 'breakfast', restaurant: '자하연' }, ['"none"'], []],
  ['getMenus', { date: '2026-10-21', meal: 'lunch', restaurant: '학관' }, ['"none"'], []],
  ['getShuttle', {}, ['"found"', '정문', '301동'], []],
  ['searchGlobalEvents', { from: '2026-10-23', to: '2026-10-23' }, ['"none"'], []],
  ['searchGlobalEvents', { from: '2026-10-21', to: '2026-10-25' }, ['"found"'], ['취업 박람회']],
  ['searchRecruitingQuests', { board: 'meal', from: '2026-10-23', to: '2026-10-23' }, ['"none"'], []],
  [
    'searchRecruitingQuests',
    { board: 'hobby' },
    ['저녁 농구 한 판', '주말 배드민턴', '아침 러닝 크루', '"placesLeft":0'],
    ['어제 점심 번개'],
  ],
];

// The seed names the cases give that the world lacks, or has as something of another kind.
function unseeded(world: World): string[] {
  return cases.flatMap((evalCase) =>
    refsOf(evalCase)
      .filter(({ kind, name }) => world.seeds[name]?.kind !== kind)
      .map(({ kind, name }) => `${evalCase.id}: ${kind} ${name}`),
  );
}

describe('The world the cases refer to', () => {
  const model = new ScriptedModel();
  let database: Awaited<ReturnType<typeof createDatabase>>;
  let app: INestApplication<Server>;
  let world: World;

  beforeAll(async () => {
    database = await createDatabase(inject('settings').DATABASE_URL);
    await seed(database.url);
    app = await startApp(
      { ...inject('settings'), DATABASE_URL: database.url },
      [],
      refuseKakao,
      refuseMatchServer,
      model.model,
    );
    vi.spyOn(app.get<Clock>(CLOCK), 'now').mockImplementation(() => new Date(NOW));
    world = await seedWorld(app);
    await world.refresh();
  });

  afterAll(async () => {
    await app.close();
    await database.drop();
  });

  it('holds every seed name a case gives, as the kind of thing the case takes it for', () => {
    expect(unseeded(world)).toEqual([]);
  });

  // What a tool answers in the world, as the scripted model calls it.
  async function answer(tool: string, input: object): Promise<string> {
    model.script({ tool, input }, { text: '…' });
    const response = await postAssistantMessages(app, world.accessToken, ask('…'));
    expect(response.status).toBe(200);
    return JSON.stringify(model.toolResults()[0]);
  }

  it.each(WORLD_FACTS)('%s %j answers what the cases expect', async (tool, input, holds, lacks) => {
    const answered = await answer(tool, input);
    expect(holds.filter((word) => !answered.includes(word))).toEqual([]);
    expect(lacks.filter((word) => answered.includes(word))).toEqual([]);
  });
});
