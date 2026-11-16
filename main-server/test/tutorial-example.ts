/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Lookup, type PlacePoint } from '../src/assistant/dto/answer.dto.js';
import { type DayItem } from '../src/assistant/free-time/free-time.js';
import { tutorialAnswer, type TutorialAnswer, type TutorialArgs } from '../src/assistant/lookup/tutorial-lookup.js';
import { type Position } from '../src/common/geometry.js';
import { readTutorialContent, TUTORIAL_FILE, type TutorialContent } from '../src/tutorial/tutorial-content.js';
import { classAt, id, ME, numbered, placeOf, readCampus, seedTravel, TUESDAY } from './way-example.js';

// The Tutorial Quests of content/tutorial.yaml on Tuesday 2026-11-17, over the seed's Places and walking table, for the
// User of the way's boards. Call `readTutorial` in a beforeAll first.

let content: TutorialContent | null = null;

export async function readTutorial(): Promise<void> {
  await readCampus();
  content = await readTutorialContent(TUTORIAL_FILE);
}

export const strong = (text: string): { text: string; strong: boolean } => ({ text, strong: true });
export const plain = (text: string): { text: string; strong: boolean } => ({ text, strong: false });

// Board q10's three quests left: the 보건진료소, the 학생증, and the 분실물센터.
export const BOARD_Q10 = ['health-clinic', 's-card', 'lost-and-found'];

export const CLINIC = '서울대 보건진료소 이용';
export const LOST = '분실물센터 위치 알아두기';
export const CARD = '학생증(S-CARD) 발급받기';
export const CLINIC_NOTE = '보건진료소는 평일 09:00–12:00, 13:30–17:30에 진료해요 · 금요일은 16:30까지';
export const LOST_NOTE = '분실물센터는 09:00–18:00에 열어요';
export const CARD_NOTE = '학생증은 MySNU 신청 다음 날부터 받아요 · 평일 09:00–17:50';

export const positionOf = (number: string): Position => {
  const { latitude, longitude } = numbered(number);
  return { latitude, longitude };
};

export const pointOf = (number: string, label: string): PlacePoint => ({
  placeId: numbered(number).id,
  label,
  ...positionOf(number),
});

// The Class in 24동 that ends at 13:50 and the one in 58동 at 17:00.
export const afternoon = (): DayItem[] => [
  classAt(TUESDAY, '13:00', '13:50', '자연과학관6'),
  classAt(TUESDAY, '17:00', '18:15', 'SK경영관'),
];

// The quests of these keys left, asked at HH:MM or HH:MM:SS.
export function tutorialAt(
  clock: string,
  keys: readonly string[],
  items: DayItem[] = afternoon(),
  more: Partial<TutorialArgs> = {},
): TutorialAnswer {
  if (content === null) {
    throw new Error('Read the tutorial first');
  }
  return tutorialAnswer({
    now: new Date(`${TUESDAY}T${clock.length === 5 ? `${clock}:00` : clock}+09:00`),
    me: { userId: ME, name: '유상', items },
    location: null,
    fromPlaceId: null,
    gatePlaceId: id('서울대 정문'),
    quests: content.quests
      .filter(({ key }) => keys.includes(key))
      .map(({ key, title, places, visit }) => ({ key, title, places, visit: visit ?? null })),
    placeIdOf: (place) => {
      if (!('place' in place)) {
        throw new Error('No quest of a point is open here');
      }
      return numbered(place.place).id;
    },
    travel: seedTravel(),
    placeOf,
    ...more,
  });
}

export function lookupOf(answer: TutorialAnswer): Lookup {
  if (answer.result !== 'found') {
    throw new Error(`No order: ${answer.reason}`);
  }
  return answer.lookup;
}
