/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { CLOCK, type Clock } from '../src/quests/clock.js';
import { postNumbersFrom } from './global-events.js';
import { answer, answeredSession, draftPost, JudgementWorld, PLACE, PLACE_LINE } from './judgements.js';

const world = new JudgementWorld();
const newPost = postNumbersFrom(988_500);

// A day written without a year is the one nearest to now.
const NOW = new Date('2081-01-15T12:00:00+09:00');

beforeAll(async () => {
  await world.start();
});

beforeEach(() => {
  vi.spyOn(world.judging.get<Clock>(CLOCK), 'now').mockReturnValue(NOW);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await world.finishEveryPost();
});

afterAll(async () => {
  await world.stop();
});

// A post of the time line, judged with the session's values, quoting `quoted` for its times.
async function judged(timeLine: string, start: string, end: string, quoted = timeLine): Promise<number> {
  world.scripted.script(
    answer([answeredSession({ start, end, lines: { start: [quoted], end: [quoted], place: [PLACE_LINE] } })]),
  );
  const postNumber = newPost();
  await world.collected(draftPost(postNumber, { start: '2081-03-04', description: `${timeLine}\n${PLACE_LINE}` }));
  return postNumber;
}

describe('A Judgement of a time written', () => {
  it.each([
    ['after a list number', '1. 3월 4일(화) 14:00~17:00', '1. 3월 4일(화) 14:00~17:00'],
    ['after a list number of two digits', '12. 3월 4일(화) 14:00~17:00', '12. 3월 4일(화) 14:00~17:00'],
    ['as hours of 오후', '- 일시: 3월 4일(화) 오후 2–5시', '3월 4일(화) 오후 2–5시'],
    ['as hours of 오후 with a tilde', '- 일시: 3월 4일(화) 오후 2~5시', '3월 4일(화) 오후 2~5시'],
    ['as hours of 오후 with a hyphen', '- 일시: 3월 4일(화) 오후 2-5시', '3월 4일(화) 오후 2-5시'],
    ['with a zero-width space', '- 일시: 3월 4일(화)\u200B 14:00~17:00', '3월 4일(화) 14:00~17:00'],
    ['with a soft hyphen', '- 일시: 3월 4일(화) 14:00~17:\u00AD00', '3월 4일(화) 14:00~17:00'],
    ['with a byte-order mark', '- 일시: 3월 4\uFEFF일(화) 14:00~17:00', '3월 4일(화) 14:00~17:00'],
  ])('%s publishes the session', async (_, timeLine, quoted) => {
    const postNumber = await judged(timeLine, '2081-03-04T14:00', '2081-03-04T17:00', quoted);

    expect(await world.onlyEvent(postNumber)).toMatchObject({
      state: 'published',
      publicationRoute: 'judgement',
      startsAt: new Date('2081-03-04T14:00:00+09:00'),
      endsAt: new Date('2081-03-04T17:00:00+09:00'),
      place: PLACE,
    });
  });

  it('as hours of 오전 publishes the session at their first hour', async () => {
    const postNumber = await judged('- 일시: 3월 4일(화) 오전 9–11시', '2081-03-04T09:00', '2081-03-04T11:00');

    expect(await world.onlyEvent(postNumber)).toMatchObject({
      state: 'published',
      startsAt: new Date('2081-03-04T09:00:00+09:00'),
      endsAt: new Date('2081-03-04T11:00:00+09:00'),
    });
  });

  it.each([
    ['a date the list number would make', '1. 3월 4일(화) 14:00~17:00', '2081-01-03T14:00', '2081-01-03T17:00'],
    ['another date', '- 일시: 3월 4일(화) 오후 2–5시', '2081-03-05T14:00', '2081-03-05T17:00'],
  ])('keeps %s a Draft, failing the date check', async (_, timeLine, start, end) => {
    const postNumber = await judged(timeLine, start, end);

    const event = await world.onlyEvent(postNumber);
    expect(event).toMatchObject({ state: 'draft', publicationRoute: null });
    const { sessions } = await world.judgementRead(event.id);
    expect(sessions[0]?.checks.filter(({ passed }) => !passed).map(({ name }) => name)).toEqual(['dateAgrees']);
  });
});
