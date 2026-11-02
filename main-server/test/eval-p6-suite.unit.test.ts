/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { z } from 'zod';
import { casesIn, loadCases, nowOf, unlabelled } from '../eval/cases.ts';
import { FIXED_SET } from '../eval/fixed-set.ts';
import { FAKE_STUDENT_NUMBER, p6WorldData, STUDENT_NUMBER_LIKE } from '../eval/p6/world-data.ts';
import { tutorialState } from '../src/tutorial/tutorial-state.js';

// The P6 suite's files (P06 ticket 06), without a model or a database: the cases load in the spec's categories and
// counts, the suite lists what the ticket asks for, the world says what the cases need, and no file of the suite holds
// anything written like a 학번 but the fake ones. Reported apart from the product's pyramid (ADR 0007).

const P6 = new URL('../eval/p6/', import.meta.url);

// The refusals by a booking's conditions, which go through proposeLibraryBooking, after resolveFriend when the request
// names Friends (labels-notes.md, rulings 16 and 18).
const CONDITION_REFUSALS: Record<string, string[]> = {
  'p6-refusals-seat-tomorrow': ['findLibrarySpace', 'proposeLibraryBooking'],
  'p6-refusals-late-and-long': ['findLibrarySpace', 'proposeLibraryBooking'],
  'p6-group-rooms-g201': ['findLibrarySpace', 'proposeLibraryBooking'],
  'p6-refusals-room-in-four-days': ['findLibrarySpace', 'resolveFriend', 'proposeLibraryBooking'],
  'p6-group-rooms-below-min': ['findLibrarySpace', 'resolveFriend', 'proposeLibraryBooking'],
  'p6-group-rooms-above-max': ['findLibrarySpace', 'resolveFriend', 'proposeLibraryBooking'],
  'p6-group-rooms-nine-people': ['findLibrarySpace', 'resolveFriend', 'proposeLibraryBooking'],
};
const cases = casesIn(loadCases(), 'p6');
const ids = new Set(cases.map(({ id }) => id));
const data = p6WorldData();

const suiteSchema = z.looseObject({
  world: z.literal('p6'),
  cases: z.record(z.string(), z.int()),
  subsets: z.record(z.string(), z.array(z.string())),
  superseded: z.array(z.strictObject({ case: z.string(), heldBy: z.string() })),
  thresholds: z.array(z.looseObject({ id: z.string(), metric: z.string(), value: z.number() })),
});

const suite = suiteSchema.parse(parse(readFileSync(new URL('suite.yaml', P6), 'utf8')));

// Every file of the suite, the cases' too, as text.
function suiteFiles(): { name: string; text: string }[] {
  const top = readdirSync(P6).filter((name) => /\.(?:ya?ml|md|json)$/u.test(name));
  const inCases = readdirSync(new URL('cases/', P6)).map((name) => `cases/${name}`);
  return [...top, ...inCases].map((name) => ({ name, text: readFileSync(new URL(name, P6), 'utf8') }));
}

// The cases that book or require proposeLibraryBooking, and those whose tools do not match how the question names its
// people. Every booking takes findLibrarySpace and then proposeLibraryBooking, with resolveFriend between them when the
// question names Friends; a held Quest is read from the conversation.
function bookingPaths(): { books: typeof cases; wrong: string[] } {
  // A Friend is named by their given name, as the questions write them: 민수 for 이민수, 하루 for 하루.
  const given = Object.values(data.friends).map(({ name }) => (name.length > 2 ? name.slice(1) : name));
  const quest = data.lunchQuest.title;
  const books = cases.filter(
    ({ expect: wanted }) =>
      wanted?.tools.required.includes('proposeLibraryBooking') === true ||
      (wanted?.cards ?? []).some(({ action, max }) => action === 'book' && max !== 0),
  );
  const wrong = books.flatMap(({ id, turns, expect: wanted }) => {
    const asked = turns.flatMap((turn) => ('user' in turn ? [turn.user] : [])).join(' ');
    const shown = turns.some((turn) => 'assistant' in turn && turn.assistant.cards.some(({ seed }) => seed === quest));
    const required = JSON.stringify(wanted?.tools.required ?? []);
    if (given.some((name) => asked.includes(name))) {
      return required === JSON.stringify(['findLibrarySpace', 'resolveFriend', 'proposeLibraryBooking']) &&
        wanted?.tools.only === true
        ? []
        : [`${id}: Friends named`];
    }
    if (shown) {
      const card = wanted?.cards?.find(({ action }) => action === 'book');
      return required === JSON.stringify(['findLibrarySpace', 'proposeLibraryBooking']) &&
        card?.conditions?.quest === quest
        ? []
        : [`${id}: held Quest`];
    }
    const plain =
      required === JSON.stringify(['findLibrarySpace', 'proposeLibraryBooking']) && wanted?.tools.only === true;
    return plain ? [] : [`${id}: no Friend named`];
  });

  return { books, wrong };
}

describe('The P6 cases', () => {
  it('hold the seven categories with their counts, 64 in all', () => {
    const counts = Object.fromEntries(Object.keys(suite.cases).map((category) => [category, 0]));
    for (const { category } of cases) {
      counts[category] = (counts[category] ?? 0) + 1;
    }

    expect(counts).toEqual({
      'p6-spaces': 14,
      'p6-conditions': 15,
      'p6-refusals': 10,
      'p6-group-rooms': 7,
      'p6-bookings': 5,
      'p6-tutorial': 8,
      'p6-common': 5,
    });
    expect(suite.cases).toEqual(counts);
  });

  it('run every case 3 times, none of them live, at the world clock', () => {
    expect(cases.filter(({ repeat, live }) => repeat !== 3 || live).map(({ id }) => id)).toEqual([]);
    expect(new Set(cases.map((evalCase) => nowOf(evalCase)))).toEqual(new Set(['2026-11-04T10:05:00+09:00']));
  });

  it('are named by their category', () => {
    expect(cases.filter(({ id, category }) => !id.startsWith(`${category}-`)).map(({ id }) => id)).toEqual([]);
  });
});

describe('The P6 labels', () => {
  // The labels were drafted blind and settled by the PM (labels-notes.md).
  it('label every case', () => {
    expect(unlabelled(cases).map(({ id }) => id)).toEqual([]);
  });

  // One right answer per case: one action, and no key that lets several answers pass, such as a set of spaces of
  // which any one counts.
  it('give each case one answer', () => {
    const several = cases.filter(({ expect: wanted }) => wanted !== undefined && wanted.actions.length !== 1);
    const loose = suiteFiles().filter(({ name, text }) => name.startsWith('cases/') && /spaceIn|either/u.test(text));

    expect(several.map(({ id }) => id)).toEqual([]);
    expect(loose.map(({ name }) => name)).toEqual([]);
  });
});

describe('The tools and words of the P6 labels', () => {
  it('let a space refusal, a CHAT and an ASK call no tool, and a condition refusal only proposeLibraryBooking', () => {
    const onlyWith: Record<string, string[]> = {
      'p6-group-rooms-same-name': ['resolveFriend'],
      'p6-conditions-free-time-one-space': ['findLibraryFreeSlots'],
      ...CONDITION_REFUSALS,
    };
    const loose = cases.flatMap(({ id, expect: wanted }) => {
      if (wanted === undefined || !['REFUSE', 'ASK', 'CHAT'].includes(wanted.actions[0] ?? '')) {
        return [];
      }
      const { required, allowed, forbidden, only } = wanted.tools;
      const tools = [...required, ...allowed].toSorted();
      const allowedHere = onlyWith[id];
      const tight =
        allowedHere === undefined
          ? forbidden === '*'
          : only === true && JSON.stringify(tools) === JSON.stringify(allowedHere.toSorted());
      return tight ? [] : [id];
    });

    expect(loose).toEqual([]);
  });
});

describe('The bookings of the P6 labels', () => {
  // proposeLibraryBooking takes Friends' ids or a Quest's, never names (labels-notes.md, ruling 18).
  it('book with named Friends through resolveFriend, and with a held Quest from the conversation', () => {
    const { books, wrong } = bookingPaths();

    expect(books.length).toBeGreaterThanOrEqual(20);
    expect(wrong).toEqual([]);
  });

  // One path per case (labels-notes.md, ruling 19): either no tool at all, or exactly the required tools.
  it('leave no tool optional in any case', () => {
    const optional = cases.filter(({ expect: wanted }) => {
      const tools = wanted?.tools;
      if (tools === undefined || tools.forbidden === '*') {
        return false;
      }
      return tools.only !== true || tools.allowed.length > 0 || tools.required.length === 0;
    });

    expect(optional.map(({ id }) => id)).toEqual([]);
  });

  // A facility's hours are a fact of the text, as the tutorial's other facts are (labels-notes.md, ruling 10), and so
  // are the hours in proposeLibraryBooking's reason, which late-and-long accepts as one wording (ruling 21).
  it('name the candidates an ASK chooses between, and no time outside an ASK but a facility fact', () => {
    const asks = cases.filter(({ expect: wanted }) => wanted?.actions[0] === 'ASK');
    const timed = cases.filter(
      ({ id, expect: wanted }) =>
        wanted !== undefined &&
        wanted.actions[0] !== 'ASK' &&
        !['p6-tutorial-clinic-hours', 'p6-refusals-late-and-long'].includes(id) &&
        JSON.stringify(wanted.text ?? {}).match(/\d{1,2}:\d{2}/u) !== null,
    );

    expect(asks.filter(({ expect: wanted }) => (wanted?.text?.mentions ?? []).length === 0)).toEqual([]);
    expect(timed.map(({ id }) => id)).toEqual([]);
  });

  it('ask only as Users of the world', () => {
    const askers = Object.keys(data.askers);

    expect(cases.filter(({ asker }) => asker !== undefined && !askers.includes(asker)).map(({ id }) => id)).toEqual([]);
  });
});

describe('The P6 suite', () => {
  it('names only cases it holds in its subsets', () => {
    const named = Object.values(suite.subsets).flat();

    expect(named.filter((id) => !ids.has(id))).toEqual([]);
    expect(suite.subsets.siteAliases).toHaveLength(4);
    expect(suite.subsets.proposedAliases).toHaveLength(4);
    expect(suite.subsets.partyLimit).toHaveLength(2);
  });

  it('lists out-of-scope-library-seats as superseded by a P6 case, and only P19 cases of the fixed set', () => {
    const fixed = new Set(Object.values(FIXED_SET).flat());

    expect(suite.superseded.map(({ case: id }) => id)).toContain('out-of-scope-library-seats');
    expect(suite.superseded.filter(({ case: id, heldBy }) => !fixed.has(id) || !ids.has(heldBy))).toEqual([]);
  });

  it('proposes a threshold for each of M1 to M5 and overall', () => {
    expect([...new Set(suite.thresholds.map(({ metric }) => metric))]).toEqual([
      'M1',
      'M2',
      'M3',
      'M4',
      'M5',
      'overall',
    ]);
  });
});

describe('The P6 world', () => {
  const users = [data.asker, ...Object.values(data.askers)];

  it('holds only fake 학번, each once', () => {
    const numbers = [...users, ...Object.values(data.friends)].map(({ studentNumber }) => studentNumber);

    expect(numbers.filter((number) => !FAKE_STUDENT_NUMBER.test(number))).toEqual([]);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it('holds every tutorial state, each as the server derives it from the progress', () => {
    const keys = ['s-card', 'admin-shuttle', 'kwanjeong', 'health-clinic', 'art-museum'];
    const derived = users.map(({ tutorial }) =>
      tutorialState(
        tutorial.enabled
          ? {
              enabledAt: new Date(0),
              stoppedAt: tutorial.stopped === undefined ? null : new Date(0),
              finishedAt: tutorial.finished === undefined ? null : new Date(0),
            }
          : null,
        tutorial.quests.map(({ key, completed }) => ({
          questKey: key,
          completedAt: completed === undefined ? null : new Date(0),
        })),
        keys,
      ),
    );

    expect(derived).toEqual(users.map(({ tutorial }) => tutorial.state));
    expect(new Set(derived)).toEqual(new Set(['off', 'available', 'active', 'stopped', 'finished']));
  });

  it('holds a 26학번 undergraduate asker, a graduate and an exchange student', () => {
    expect([data.asker.admissionYear, data.asker.affiliation]).toEqual([2026, 'undergraduate']);
    expect(Object.values(data.askers).map(({ affiliation }) => affiliation)).toEqual(
      expect.arrayContaining(['graduate', 'exchange']),
    );
  });

  it('holds two Friends of one name, enough Friends for 9 people, and a lunch Quest of Friends', () => {
    const names = Object.values(data.friends).map(({ name }) => name);

    expect(names.length - new Set(names).size).toBe(1);
    expect(names.length).toBeGreaterThanOrEqual(8);
    expect(data.lunchQuest.holders.filter((seed) => data.friends[seed] === undefined)).toEqual([]);
  });
});

describe('The privacy of the P6 files', () => {
  it('holds nothing written like a 학번 but the fake ones, hyphenated', () => {
    const real = suiteFiles().flatMap(({ name, text }) =>
      [...text.matchAll(STUDENT_NUMBER_LIKE)]
        .map(([written]) => written)
        .filter((written) => !FAKE_STUDENT_NUMBER.test(written))
        .map((written) => `${name}: ${written}`),
    );

    expect(real).toEqual([]);
  });

  it('checks the files it means to', () => {
    const names = suiteFiles().map(({ name }) => name);

    expect(names).toEqual(expect.arrayContaining(['world.yaml', 'suite.yaml', 'rules.md', 'cases/spaces.yaml']));
  });
});
