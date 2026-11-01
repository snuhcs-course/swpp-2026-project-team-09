/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { randomFrom } from './dice.ts';
import { traps } from './traps.ts';
import { readWordings, type Wordings } from './wordings.ts';

// The sample of the model-drafted wordings that a person checks (P05 ticket 02b), drawn with a fixed seed: from every
// activity a title and a misspelt one, or two titles where it has no misspelt one; from every kind of Global Event a
// title and its misspelt one; and every title of the traps that is not in the list. Its result is kept in
// large-world-vN/wordings-check.json. `node eval/p5/large-world/wordings-sample.ts` prints it as JSON.

export interface SampleItem {
  id: string;
  // The activity's key in the list, and its name.
  key: string;
  activity: string;
  // quest, event: a title of the list. trap: by hand, in traps.ts.
  source: 'quest' | 'event' | 'trap';
  misspelt: boolean;
  wording: string;
}

export const SAMPLE_SEED = 20261102;

type Activities = Wordings['activities'];

function drawnFrom(seed: number): (items: readonly string[], count: number) => string[] {
  const random = randomFrom(seed);
  return (items, count) => {
    const left = [...items];
    return Array.from(
      { length: Math.min(count, left.length) },
      () => left.splice(Math.floor(random() * left.length), 1)[0] ?? '',
    );
  };
}

function listedSample(activities: Activities, seed: number): Omit<SampleItem, 'id'>[] {
  const drawn = drawnFrom(seed);
  return Object.entries(activities).flatMap(([activity, { name, quest, event }]) => {
    const items = (
      source: 'quest' | 'event',
      misspelt: boolean,
      wordings: readonly string[],
    ): Omit<SampleItem, 'id'>[] =>
      wordings.map((wording) => ({ key: activity, activity: name, source, misspelt, wording }));
    const forQuests = items('quest', false, drawn(quest.titles, quest.typos.length > 0 ? 1 : 2)).concat(
      items('quest', true, drawn(quest.typos, 1)),
    );
    return event === undefined
      ? forQuests
      : forQuests.concat(items('event', false, drawn(event.titles, 1)), items('event', true, drawn(event.typos, 1)));
  });
}

function trapSample(activities: Activities): Omit<SampleItem, 'id'>[] {
  const written = new Set(
    Object.values(activities).flatMap(({ quest, event }) =>
      quest.titles.concat(quest.typos, event?.titles ?? [], event?.typos ?? []),
    ),
  );
  const { quests, globalEvents } = traps();
  const titles = new Map([...quests, ...globalEvents].map((trap) => [trap.title, trap]));
  return [...titles]
    .filter(([title]) => !written.has(title))
    .map(([wording, { activity, trap }]) => ({
      key: activity,
      activity: activities[activity]?.name ?? activity,
      source: 'trap',
      misspelt: trap === 'misspelt',
      wording,
    }));
}

function sampleOf({ activities }: Wordings, seed: number): SampleItem[] {
  return [...listedSample(activities, seed), ...trapSample(activities)].map((item, index) =>
    Object.assign(item, { id: `w${String(index + 1).padStart(3, '0')}-${item.key}` }),
  );
}

export const wordingsSample = (wordings: Wordings = readWordings()): SampleItem[] => sampleOf(wordings, SAMPLE_SEED);

if (process.argv[1] === new URL(import.meta.url).pathname) {
  console.log(JSON.stringify(wordingsSample()));
}
