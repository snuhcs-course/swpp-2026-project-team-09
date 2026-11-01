/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { publishedAmong, type PublishedEvent } from './global-event-lists.js';
import { postNumbersFrom } from './global-events.js';
import { answer, answeredSession, type AnsweredSession, draftPost, JudgementWorld, PLACE_LINE } from './judgements.js';
import { signIn } from './sign-in.js';

const world = new JudgementWorld();
const newPost = postNumbersFrom(987_000);

// Years ahead, so that the User's list goes on holding it.
const PERIOD_LINE = '- 전시 기간: 2099.11.05 - 2099.11.30';

function period(changes: Partial<AnsweredSession> = {}): AnsweredSession {
  return answeredSession({
    start: '2099-11-05',
    end: '2099-11-30',
    overPeriod: true,
    lines: { start: [PERIOD_LINE], end: [PERIOD_LINE], place: [PLACE_LINE] },
    ...changes,
  });
}

// Scripts the answer, collects a post of the lines and gives its one event.
async function judged(session: AnsweredSession, ...lines: string[]): ReturnType<JudgementWorld['onlyEvent']> {
  world.scripted.script(answer([session]));
  const postNumber = newPost();
  await world.collected(draftPost(postNumber, { description: [...lines, PLACE_LINE].join('\n') }));
  return world.onlyEvent(postNumber);
}

async function listed(eventId: string): Promise<PublishedEvent | undefined> {
  const { accessToken } = await signIn(world.judging);
  const [event] = await publishedAmong(world.judging, accessToken, [eventId]);
  return event;
}

beforeAll(async () => {
  await world.start();
});

afterEach(async () => {
  await world.finishEveryPost();
});

afterAll(async () => {
  await world.stop();
});

describe('A session over a period that passes', () => {
  it("is published through to its last day, and the User's list gives both", async () => {
    const event = await judged(period(), PERIOD_LINE);

    expect(event).toMatchObject({
      state: 'published',
      publicationRoute: 'judgement',
      startsAt: new Date('2099-11-05T00:00:00+09:00'),
      endsAt: new Date('2099-11-30T23:59:00+09:00'),
    });
    expect(await listed(event.id)).toMatchObject({
      startsAt: '2099-11-04T15:00:00.000Z',
      endsAt: '2099-11-30T14:59:00.000Z',
    });
  });

  it('takes the 00:00 extra.snu writes at the end for no time', async () => {
    const line = '기간: 2099.11.02. 00:00 ~ 2099.11.30. 00:00';
    const lines = { start: [line], end: [line], place: [PLACE_LINE] };

    const event = await judged(period({ start: '2099-11-02T00:00', end: '2099-11-30T00:00', lines }), line);

    expect(event).toMatchObject({
      state: 'published',
      startsAt: new Date('2099-11-02T00:00:00+09:00'),
      endsAt: new Date('2099-11-30T23:59:00+09:00'),
    });
  });

  it('keeps an end the line gives a time', async () => {
    const line = '- 전시 기간: 2099.11.05 10:00 - 2099.11.30 18:00';
    const lines = { start: [line], end: [line], place: [PLACE_LINE] };

    const event = await judged(period({ start: '2099-11-05T10:00', end: '2099-11-30T18:00', lines }), line);

    expect(event).toMatchObject({ state: 'published', endsAt: new Date('2099-11-30T18:00:00+09:00') });
  });
});

describe('A session over a period that is refused', () => {
  it('stays a Draft out of the list when no line holds both its days, with the check stored', async () => {
    const first = '- 전시 시작: 2099.11.05';
    const last = '- 전시 종료: 2099.11.30';
    const lines = { start: [first], end: [last], place: [PLACE_LINE] };

    const event = await judged(period({ lines }), first, last);

    expect(event.state).toBe('draft');
    expect(await listed(event.id)).toBeUndefined();
    const { sessions } = await world.judgementRead(event.id);
    expect(sessions[0]?.checks.filter(({ passed }) => !passed).map(({ name }) => name)).toEqual(['length']);
  });

  it('stays a Draft when read as one sitting on its first day', async () => {
    const session = period({ start: '2099-11-05T10:00', end: '2099-11-05T18:00', overPeriod: false });
    const line = `${PERIOD_LINE} 10:00-18:00`;
    const lines = { start: [line], end: [line], place: [PLACE_LINE] };

    const event = await judged({ ...session, lines }, line);

    expect(event.state).toBe('draft');
  });
});
