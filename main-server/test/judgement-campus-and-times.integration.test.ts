/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// The publication step with a scripted Judgement, on posts written for these tests: a place that does not name the
// campus is read on Gwanak, and a post whose lines give its day two times stays a Draft.

import { storedSessions } from '../src/global-events/judgement-answer.js';
import { postNumbersFrom } from './global-events.js';
import { answer, answeredSession, draftPost, JudgementWorld } from './judgements.js';

const world = new JudgementWorld();
const newPost = postNumbersFrom(989_400);

const TIME_LINE = '- 일시: 2088. 3. 4. 14:00~16:00';

beforeAll(async () => {
  await world.start();
});

afterEach(async () => {
  await world.finishEveryPost();
});

afterAll(async () => {
  await world.stop();
});

// A post of `lines`, judged as one session from 14:00 to 16:00 at `place`, quoting the first line for its times.
async function judged(lines: string[], place: string): Promise<number> {
  const [timeLine = '', placeLine = ''] = lines;
  world.scripted.script(
    answer([
      answeredSession({
        start: '2088-03-04T14:00',
        end: '2088-03-04T16:00',
        place,
        lines: { start: [timeLine], end: [timeLine], place: [placeLine] },
      }),
    ]),
  );
  const postNumber = newPost();
  await world.collected(draftPost(postNumber, { start: '2088-03-04', description: lines.join('\n') }));
  return postNumber;
}

describe('A Judgement of a place that does not name the campus', () => {
  it('publishes a session at 문화관 로비 at 문화관', async () => {
    const postNumber = await judged([TIME_LINE, '- 장소: 문화관 로비', '14:30~15:00 휴식'], '문화관 로비');

    const event = await world.onlyEvent(postNumber);
    const place = await world.prisma.place.findFirstOrThrow({ where: { name: '문화관', number: '73' } });
    expect(event).toMatchObject({
      state: 'published',
      publicationRoute: 'judgement',
      startsAt: new Date('2088-03-04T14:00:00+09:00'),
      endsAt: new Date('2088-03-04T16:00:00+09:00'),
      place: '문화관 로비',
      latitude: place.latitude,
      longitude: place.longitude,
    });
    const judgement = await world.judgementOf(postNumber);
    expect(storedSessions(judgement?.sessions ?? null)[0]?.placeId).toBe(place.id);
  });
});

describe('A Judgement of a post whose lines give its day two times', () => {
  it('keeps the session a Draft, failing timesConsistent', async () => {
    const postNumber = await judged(
      [TIME_LINE, '- 장소: 문화관 로비', '※ 2088. 3. 4. 행사는 15:00에 시작합니다.'],
      '문화관 로비',
    );

    const event = await world.onlyEvent(postNumber);
    expect(event).toMatchObject({ state: 'draft', publicationRoute: null });
    const { sessions } = await world.judgementRead(event.id);
    expect(sessions[0]?.checks.filter(({ passed }) => !passed).map(({ name }) => name)).toEqual(['timesConsistent']);
  });
});
