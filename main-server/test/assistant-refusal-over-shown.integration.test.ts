/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';
import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import { MealPlanStage, type Named, resolve } from './meal-plan.js';
import { type Step } from './scripted-model.js';

// A refusal over what is on screen (P02 ticket 15) at the Assistant's endpoint with the scripted model and the seed's
// Places: the refusal of a Friend's course and room beside the Friend Lookup (board n4), of another library's room
// beside the way to it (n20), of accepting for a Friend (n8b), and the way asked about the shuttle when it is not
// running (n21).

const stage = new MealPlanStage();

beforeAll(() => stage.start());

afterAll(() => stage.stop());

const replySchema = z.object({
  text: z.string(),
  answer: z.unknown(),
  lookup: z.custom<Lookup | null>(),
  refusal: z.unknown(),
});

type Reply = z.infer<typeof replySchema>;

const refuse = (input: object): Step => ({ tool: 'refuse', input });

const findFriend = (friendId: string): Step => ({ tool: 'findFriend', input: { friendId } });

const SILENT: Step = { text: '' };

const plain = (text: string): { text: string; strong: boolean } => ({ text, strong: false });
const strong = (text: string): { text: string; strong: boolean } => ({ text, strong: true });

const askOffer = (label: string, text = label): object => ({ kind: 'ask', label, text });

async function replyTo(steps: Step[], words: string, more: object = {}): Promise<Reply> {
  const response = await stage.send(steps, more, words);
  expect(response.status).toBe(200);
  return replySchema.parse(response.body);
}

const lookupOf = ({ lookup }: Reply): Lookup => {
  if (lookup === null) {
    throw new Error('The reply has no Lookup');
  }
  return lookup;
};

const textsOf = (lines: { text: string }[][]): string[] => lines.map((line) => line.map(({ text }) => text).join(''));

async function at(number: string): Promise<{ context: { location: { latitude: number; longitude: number } } }> {
  const { latitude, longitude } = await stage.numbered(number);
  return { context: { location: { latitude, longitude } } };
}

// Board n4, on a Tuesday at 11:50, with the Friend 민수 seen through the Timetable in a Class in 302동 until 12:15.
async function withMinsu(date: string): Promise<Named> {
  await stage.asking(date, '11:50');
  const minsu = await stage.friend('민수');
  await stage.classAt(minsu, '11:00', '12:15', '302');
  return minsu;
}

const COURSE_REFUSED = {
  kind: 'course-and-room',
  lines: [[plain('과목과 강의실은 보이지 않아요')], [strong('12:15'), plain('에 302동에서 수업이 끝나요')]],
  offers: [askOffer('만나고 싶다', '민수랑 만나고 싶어')],
};

describe('"민수 지금 무슨 수업 들어?" (board n4)', () => {
  it('draws 민수 as the Timetable shows him, named so in the chip, beside the refusal of his course and room', async () => {
    const minsu = await withMinsu('2096-03-06');

    const reply = await replyTo(
      [resolve('민수'), findFriend(minsu.id), refuse({ kind: 'course-and-room', userId: minsu.id }), SILENT],
      '민수 지금 무슨 수업 들어?',
    );

    expect(reply.refusal).toEqual(COURSE_REFUSED);
    const lookup = lookupOf(reply);
    expect(lookup.kind).toBe('friend');
    expect(lookup.chips).toEqual([{ kind: 'person', text: '민수 · 시간표', userId: minsu.id }]);
    expect(lookup.scene.people).toMatchObject([
      { userId: minsu.id, source: 'timetable', tag: '민수 · 수업 중 12:15까지' },
    ]);
    expect(lookup.actions).toEqual([{ kind: 'meet', userId: minsu.id }]);
    expect(reply.text).toBe('과목과 강의실은 보이지 않아요\n12:15에 302동에서 수업이 끝나요');
  });

  it('is the same reply when the model refuses first and finds 민수 after', async () => {
    const minsu = await withMinsu('2096-03-13');

    const reply = await replyTo(
      [resolve('민수'), refuse({ kind: 'course-and-room', userId: minsu.id }), findFriend(minsu.id), SILENT],
      '민수 지금 무슨 수업 들어?',
    );

    expect(reply.refusal).toEqual(COURSE_REFUSED);
    expect(lookupOf(reply).chips).toEqual([{ kind: 'person', text: '민수 · 시간표', userId: minsu.id }]);
  });

  it('is the refusal alone, its lines and its offer, when the model draws no Friend', async () => {
    const minsu = await withMinsu('2096-03-20');

    const reply = await replyTo(
      [resolve('민수'), refuse({ kind: 'course-and-room', userId: minsu.id }), SILENT],
      '민수 지금 무슨 수업 들어?',
    );

    expect(reply.refusal).toEqual(COURSE_REFUSED);
    expect(reply.lookup).toBeNull();
  });
});

describe('A refusal of course and room', () => {
  it('is not kept beside a Lookup of another kind', async () => {
    const minsu = await withMinsu('2096-03-27');
    const steps = [
      resolve('민수'),
      refuse({ kind: 'course-and-room', userId: minsu.id }),
      { tool: 'resolvePlace', input: { words: '302동' } },
      { tool: 'findWay', input: { to: (await stage.numbered('302')).id } },
      { text: '…' },
    ];

    const reply = await replyTo(steps, '민수 지금 무슨 수업 들어?', await at('301'));

    expect(reply.refusal).toBeNull();
    expect(lookupOf(reply).kind).toBe('way');
  });
});

describe('"신양 스터디룸 예약해 줘" (board n20)', () => {
  it('draws the way to 신양 beside the refusal, which names it and offers 관정 스터디룸', async () => {
    await stage.asking('2096-03-06', '14:10');
    const shinyang = await stage.numbered('44-1');

    const reply = await replyTo(
      [
        { tool: 'resolvePlace', input: { words: '신양학술정보관' } },
        { tool: 'findWay', input: { to: shinyang.id } },
        refuse({ kind: 'other-library', placeId: shinyang.id }),
        SILENT,
      ],
      '신양 스터디룸 예약해 줘',
      await at('301'),
    );

    expect(reply.refusal).toEqual({
      kind: 'other-library',
      lines: [[plain('앱이 예약하는 곳은 관정뿐이에요')], [plain('신양학술정보관은 그곳의 방식으로 예약해요')]],
      offers: [askOffer('관정 스터디룸')],
    });
    const lookup = lookupOf(reply);
    expect(lookup.kind).toBe('way');
    expect(lookup.chips.map(({ text }) => text)).toEqual(['301동에서']);
    expect(lookup.scene.places.map(({ place }) => place.placeId)).toEqual([shinyang.id]);
  });

  it('asks for the library first when the model names none', async () => {
    await stage.asking('2096-03-13', '14:10');

    const reply = await replyTo([refuse({ kind: 'other-library' }), { text: '…' }], '신양 스터디룸 예약해 줘');

    expect(reply.refusal).toBeNull();
    expect(stage.model.toolResults()[0]).toMatchObject({ result: 'none' });
  });
});

describe('"민수 대신 수락해 줘" (board n8b)', () => {
  it('says that 민수 accepts himself, in one line the card puts over what it keeps, with no offer', async () => {
    const minsu = await withMinsu('2096-03-06');

    const reply = await replyTo(
      [resolve('민수'), refuse({ kind: 'for-someone-else', userId: minsu.id }), SILENT],
      '민수 대신 수락해 줘',
    );

    expect(reply.refusal).toEqual({
      kind: 'for-someone-else',
      lines: [[plain('수락은 민수가 직접 해요')]],
      offers: [],
    });
    expect(reply.lookup).toBeNull();
    expect(reply.text).toBe('수락은 민수가 직접 해요');
  });
});

// The way to 919동 from 관정 at 22:10, with findWay given `about`.
async function toDormitory(about: object): Promise<Lookup> {
  await stage.asking('2096-03-06', '22:10');
  const dormitory = await stage.numbered('919');
  const reply = await replyTo(
    [
      { tool: 'resolvePlace', input: { words: '919동' } },
      { tool: 'findWay', input: { to: dormitory.id, ...about } },
      { text: '셔틀은 지금 다니지 않아요.' },
    ],
    '기숙사 가는 셔틀 언제 와?',
    await at('62-1'),
  );
  return lookupOf(reply);
}

describe('"기숙사 가는 셔틀 언제 와?" at 22:10 at 관정 (board n21)', () => {
  it('says the shuttle is not running and how long the walk is, flags the arrival, and offers no button', async () => {
    const lookup = await toDormitory({ about: 'shuttle' });

    expect(textsOf(lookup.lines)).toEqual([
      '셔틀은 지금 다니지 않아요 (평일 8–21시)',
      '(관악사)학부 생활관(919동)까지 걸어서 11분이에요',
    ]);
    expect(lookup.lines[1]).toContainEqual(strong('11분'));
    expect(lookup.scene.flags.map(({ text, role }) => [text, role])).toEqual([['22:21 도착 · 919동', 'place']]);
    expect(lookup.actions).toEqual([]);
  });

  it('keeps the words of a way when the question is not about the shuttle', async () => {
    const lookup = await toDormitory({});

    expect(textsOf(lookup.lines)[0]).toBe('(관악사)학부 생활관(919동)은 여기예요');
    expect(lookup.actions.map(({ kind }) => kind)).toEqual(['guide']);
  });
});
