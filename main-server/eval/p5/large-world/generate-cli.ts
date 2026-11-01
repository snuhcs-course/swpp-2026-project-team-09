/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { stringify } from 'yaml';
import { type Answer, answerOf, CAPACITY_OF_A_REPLY } from './answers.ts';
import { generateWorld } from './generate.ts';
import { type Question, QUESTIONS, REACHED_BY_THE_TICKETS } from './questions.ts';
import { type Until, untilOf } from './server-stages.ts';
import { positionsFromSeed, readWordings } from './wordings.ts';
import { directoryOf, type LargeWorldData, sha256Of } from './world-data.ts';

// `node eval/p5/large-world/generate-cli.ts --version large-world-vN [--seed N] [--dry-run]`: makes a new version of the
// large world: its data file, its cases with their answers computed once, and their intended calls. It refuses a version
// that exists, since a change to a world or its answers makes a new version. A run never comes here.

interface Row {
  question: Question;
  answer: Answer;
  until: Until;
}

const TOOLS_OF = {
  searchRecruitingQuests: 'showQuests',
  searchGlobalEvents: 'showGlobalEvents',
} as const;

// A case as eval/p5/cases/search.yaml writes one: an exact set of cards, with what the reply must say when it has none.
function caseOf({ id, text }: Question, world: string, { quests, globalEvents }: Answer): object {
  const required = [
    ...(quests.length > 0 ? ['searchRecruitingQuests', TOOLS_OF.searchRecruitingQuests] : []),
    ...(globalEvents.length > 0 ? ['searchGlobalEvents', TOOLS_OF.searchGlobalEvents] : []),
  ];
  const empty = required.length === 0;
  const allowed = [
    'searchRecruitingQuests',
    'showQuests',
    'searchGlobalEvents',
    'showGlobalEvents',
    'resolveGlobalEvent',
    'resolvePlace',
  ].filter((tool) => !required.includes(tool) && !(empty && tool.startsWith('show')));
  return {
    id,
    category: 'search',
    world,
    repeat: 3,
    turns: [{ user: text }],
    expect: {
      actions: ['TOOL'],
      tools: {
        ...(empty ? {} : { required }),
        allowed,
        forbidden: empty ? ['proposeQuest', 'showQuests', 'showGlobalEvents'] : ['proposeQuest'],
      },
      cards: [
        { kind: 'quest', seeds: quests, max: quests.length },
        { kind: 'globalEvent', seeds: globalEvents, max: globalEvents.length },
      ],
      ...(empty ? { text: { mentions: [['없', '찾지 못', '못 찾']] } } : {}),
    },
  };
}

// Refuses a question whose answer the rules or the reply's limit cannot hold, or that lost the trap it is there for.
function problemsOf(
  { id, subset, literal, holds = [], lacks = [] }: Question,
  { quests, globalEvents }: Answer,
  world: LargeWorldData,
): string[] {
  const cards = [...quests, ...globalEvents];
  const titled = [...world.quests, ...world.globalEvents];
  const titleOf = (key: string): string => titled.find((one) => one.key === key)?.title ?? '';
  return [
    ...(cards.length > CAPACITY_OF_A_REPLY ? [`${id}: ${cards.length} cards`] : []),
    ...(cards.length === 0 && subset !== 'E' ? [`${id}: no card`] : []),
    ...holds.filter((key) => !cards.includes(key)).map((key) => `${id}: lost ${key}`),
    ...lacks.filter((key) => cards.includes(key)).map((key) => `${id}: holds ${key}`),
    ...(literal === undefined
      ? []
      : cards.filter((key) => !titleOf(key).includes(literal)).map((key) => `${id}: ${key} lacks ${literal}`)),
  ];
}

const recordLines = (records: readonly object[]): string =>
  records.map((record) => `    ${JSON.stringify(record)}`).join(',\n');

// One record to a line, so that a diff of a new version reads.
function dataFile(world: LargeWorldData): string {
  const { globalEvents, quests, ...rest } = world;
  const head = JSON.stringify(rest, null, 2).slice(0, -2);
  return `${head},\n  "globalEvents": [\n${recordLines(globalEvents)}\n  ],\n  "quests": [\n${recordLines(quests)}\n  ]\n}\n`;
}

// What suite.yaml takes for the version: the hashes that pin its files, and each subset's (case id, seed) tags.
function suiteSection(version: string, directory: URL, rows: readonly Row[]): string {
  const subsets = [...new Set(rows.map(({ question: { subset } }) => subset))];
  const tagsOf = (subset: string): string[] =>
    rows
      .filter(({ question }) => question.subset === subset)
      .flatMap(({ question: { id }, answer: { quests, globalEvents } }) => {
        const seeds = [...quests, ...globalEvents];
        const written = seeds.length === 0 ? ['null'] : seeds;
        return written.map((seed) => `      - { case: ${id}, seed: ${seed} }`);
      });
  return [
    `  version: ${version}`,
    `  worldSha256: ${sha256Of(new URL('world.json', directory))}`,
    `  casesSha256: ${sha256Of(new URL('cases/search.yaml', directory))}`,
    '  tags:',
    ...subsets.flatMap((subset) => [`    ${subset}:`].concat(tagsOf(subset))),
  ].join('\n');
}

function report(rows: readonly Row[], world: LargeWorldData): void {
  console.log(`${world.quests.length} Quests, ${world.globalEvents.length} Global Events`);
  for (const { question, answer, until } of rows) {
    console.log(`${question.id}\t${answer.quests.length}\t${answer.globalEvents.length}\t${String(until)}`);
  }
}

function rowsOf(world: LargeWorldData): Row[] {
  return QUESTIONS.map((question) => {
    const answer = answerOf(question.conditions, world);
    return { question, answer, until: untilOf(question.calls, [...answer.quests, ...answer.globalEvents], world) };
  });
}

// What refuses the version: each question's problems, and what the tickets could never reach.
function refusalsOf(rows: readonly Row[], world: LargeWorldData): string[] {
  return rows.flatMap(({ question, answer, until }) => [
    ...problemsOf(question, answer, world),
    ...(REACHED_BY_THE_TICKETS.has(question.subset) && until === 'search stage 1'
      ? [`${question.id}: its server recall must reach 1.0 after ticket 11`]
      : []),
    ...question.calls.flatMap(({ input: { words } }) =>
      Array.isArray(words) && words.length > 5 ? [`${question.id}: more than 5 words`] : [],
    ),
    ...(question.subset === 'V' && until === null ? [`${question.id}: the search of today already holds it`] : []),
  ]);
}

function writeVersion(directory: URL, version: string, world: LargeWorldData, rows: readonly Row[]): void {
  mkdirSync(new URL('cases/', directory), { recursive: true });
  writeFileSync(new URL('world.json', directory), dataFile(world));
  writeFileSync(
    new URL('cases/search.yaml', directory),
    stringify(rows.map(({ question, answer }) => caseOf(question, version, answer))),
  );
  writeFileSync(
    new URL('intended.yaml', directory),
    stringify(rows.map(({ question: { id, calls }, until }) => ({ case: id, until, calls }))),
  );
}

function main(): number {
  const { values } = parseArgs({
    options: {
      version: { type: 'string' },
      seed: { type: 'string', default: '20261101' },
      'dry-run': { type: 'boolean', default: false },
    },
  });
  const { version } = values;
  if (version === undefined || !/^large-world-v\d+$/u.test(version)) {
    console.error('Give --version large-world-vN.');
    return 1;
  }
  const directory = directoryOf(version);
  if (existsSync(new URL('world.json', directory)) && !values['dry-run']) {
    console.error(`${version} exists. A change to a world or its answers makes a new version.`);
    return 1;
  }
  const wordings = readWordings();
  const campusMap: unknown = JSON.parse(
    readFileSync(new URL('../../../seed/campus-map-places.json', import.meta.url), 'utf8'),
  );
  const world = generateWorld(version, Number(values.seed), wordings, positionsFromSeed(wordings, campusMap));
  const rows = rowsOf(world);
  report(rows, world);
  const refusals = refusalsOf(rows, world);
  if (refusals.length > 0) {
    console.error(refusals.join('\n'));
    return 1;
  }
  if (!values['dry-run']) {
    writeVersion(directory, version, world, rows);
    console.log(`\nFor suite.yaml, under largeWorld:\n${suiteSection(version, directory, rows)}`);
  }
  return 0;
}

process.exitCode = main();
