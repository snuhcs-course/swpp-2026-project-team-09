/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MapScene } from '@/api/assistant-types';
import { FRIEND_LOOKUP } from '@/api/mock/data/friend-lookup';
import { MEAL_ANSWER } from '@/api/mock/data/meal-answer';
import { MEAL_ANSWER_THREE } from '@/api/mock/data/meal-answers';
import { drawingOf, drawingOfScene } from '@/features/assistant/answer-marks';
import { JIEUN_ID, label, MINSU_ID, seen } from '../support/answer-marks';

// The stored answer for two people with 민수's name in the scene of its third Plan changed to `name`, and the tag to
// `tag` where one is given.
function thirdWithMinsuNamed(name: string, tag?: string): AnswerReply {
  const plan = MEAL_ANSWER.plans[2];
  if (plan === undefined) {
    throw new Error('The stored answer has no third Plan');
  }
  const people = plan.scene.people.map((person) =>
    person.userId === MINSU_ID ? { ...person, name, tag: tag ?? person.tag } : person,
  );
  const plans = MEAL_ANSWER.plans.map((one) => (one === plan ? { ...plan, scene: { ...plan.scene, people } } : one));
  return { ...MEAL_ANSWER, plans };
}

// Partitions: a Friend of a two-character name whose tag is the name alone, one whose tag is the name and more, a
// Friend of a three-character name, one of two characters the face does not show whole, and the User's own dot. The
// rule: the design review of 2026-11-15 and ticket 18, a face shows the everyday Avatar's letters, so its tag leaves
// out a name the face shows whole; the name read aloud is the whole tag.
describe("a face's tag", () => {
  it('is no label for the tag "민수" of the first Plan, and the name read aloud is "민수"', () => {
    expect(seen(drawingOf(MEAL_ANSWER, 0), `answer:person:${MINSU_ID}`)).toMatchObject({
      name: '민수',
      symbol: { type: 'face', name: '민수' },
      label: null,
    });
  });

  it('is "18분" for the tag "민수 · 18분" of the third Plan, read aloud whole', () => {
    expect(seen(drawingOf(MEAL_ANSWER, 2), `answer:person:${MINSU_ID}`)).toMatchObject({
      name: '민수 · 18분',
      label: label('right', 'person', '18분'),
    });
  });

  it('is "5분" for the tag "지은 · 5분" of the answer for three', () => {
    expect(seen(drawingOf(MEAL_ANSWER_THREE, 0), `answer:person:${JIEUN_ID}`)).toMatchObject({
      name: '지은 · 5분',
      label: { title: '5분' },
    });
  });

  it('keeps the tag as the server wrote it for a name of three characters', () => {
    // Changed from the stored copy: 민수's name is "김민수", whose face shows "민수" only.
    expect(seen(drawingOf(thirdWithMinsuNamed('김민수'), 2), `answer:person:${MINSU_ID}`)).toMatchObject({
      name: '민수 · 18분',
      symbol: { type: 'face', name: '김민수' },
      label: label('right', 'person', '민수 · 18분'),
    });
  });

  it('keeps the tag whole for a name of two letters whose face shows "L" only', () => {
    // Changed from the stored copy: 민수 is named "Li" and tagged "Li · 18분", as the main server tags a person by name.
    expect(seen(drawingOf(thirdWithMinsuNamed('Li', 'Li · 18분'), 2), `answer:person:${MINSU_ID}`)).toMatchObject({
      name: 'Li · 18분',
      symbol: { type: 'face', name: 'Li' },
      label: { title: 'Li · 18분' },
    });
  });

  it("keeps the User's own tag, which is no face", () => {
    expect(seen(drawingOf(MEAL_ANSWER, 0), 'answer:me')).toMatchObject({
      symbol: { type: 'me' },
      label: { title: '나 · 3분' },
    });
  });
});

type Source = MapScene['people'][number]['source'];

// The stored Lookup for "민수 어디야?", whose 민수 is seen at the building he is in, with his source changed to
// `source` for the level it stands for.
function minsuSeenAt(source: Source): MapScene {
  const { scene } = FRIEND_LOOKUP;
  const [minsu] = scene.people;
  if (minsu === undefined) {
    throw new Error('The stored Lookup has no 민수');
  }
  return { ...scene, people: [{ ...minsu, source }] };
}

// Partitions: a Friend at the exact level, at the building level, and from the Timetable; the User's own symbol.
// Expected values: P02 ticket 20, the green dot at the exact level only, the plain ring at the building level, and
// the dashed ring from the Timetable as before.
describe("a face's level", () => {
  it.each([
    ['exact', { type: 'face', name: '민수', dashed: false, exact: true }],
    ['building', { type: 'face', name: '민수', dashed: false }],
    ['timetable', { type: 'face', name: '민수', dashed: true }],
  ] as const)('draws a Friend at the %s level as the ticket says', (source, symbol) => {
    expect(seen(drawingOfScene(minsuSeenAt(source)), `answer:person:${MINSU_ID}`).symbol).toEqual(symbol);
  });

  it("keeps the User's own dot, whose source is the exact level", () => {
    expect(seen(drawingOf(MEAL_ANSWER, 0), 'answer:me').symbol).toEqual({ type: 'me' });
  });
});
