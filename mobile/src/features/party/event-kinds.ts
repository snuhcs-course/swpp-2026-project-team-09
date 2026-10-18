/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { GlobalEvent } from '@/api/types';

// The event picker's tabs and an event's tags. A Global Event of the main server has neither a kind nor tags, so the
// app reads both from its words until it has them (P06 spec, Mocks; ticket 08 lists the fields).

export type EventKind = 'career' | 'event' | 'festival';

// The picker's tabs, in the frame's order.
export const EVENT_KINDS: readonly { key: EventKind; label: string }[] = [
  { key: 'career', label: '진로' },
  { key: 'event', label: '이벤트' },
  { key: 'festival', label: '축제' },
];

const FESTIVAL = /축제|페스티벌|대동제/u;
const CAREER = /설명회|채용|취업|커리어|진로|대학원|인턴|멘토링|면접|자소서|직무|연합전공|전공/u;

type Words = Pick<GlobalEvent, 'title' | 'description'>;

function wordsOf({ title, description }: Words): string {
  return `${title} ${description}`;
}

// 축제 by its name, 진로 by what careers and study are called, and 이벤트 for the rest.
export function eventKindOf(event: Words): EventKind {
  const words = wordsOf(event);
  if (FESTIVAL.test(words)) {
    return 'festival';
  }
  return CAREER.test(words) ? 'career' : 'event';
}

// The words that become a tag when an event names them, each as its tag.
const TAG_WORDS: readonly (readonly [RegExp, string])[] = [
  [/AI|인공지능/u, 'AI'],
  [/커리어/u, '커리어'],
  [/채용/u, '채용'],
  [/취업/u, '취업'],
  [/대학원/u, '대학원'],
  [/연합전공|전공/u, '전공'],
  [/인턴/u, '인턴'],
  [/공연|콘서트/u, '공연'],
  [/전시/u, '전시'],
  [/북토크|도서관|독서/u, '독서'],
  [/강연|특강/u, '강연'],
  [/공모전/u, '공모전'],
  [/봉사/u, '봉사'],
  [/운동|러닝|마라톤/u, '운동'],
  [/미팅/u, '미팅'],
  [/푸드|먹거리/u, '먹거리'],
];

const MOST_TAGS = 3;

// The kind's own tag, then what the event names: "AI 커리어 설명회" gives 진로, AI and 커리어. Without '#'.
export function eventTagsOf(event: Words): string[] {
  const words = wordsOf(event);
  const kind = eventKindOf(event);
  const named = TAG_WORDS.filter(([pattern]) => pattern.test(words)).map(([, tag]) => tag);
  const own = kind === 'event' ? [] : [kind === 'career' ? '진로' : '축제'];
  return [...new Set([...own, ...named])].slice(0, MOST_TAGS);
}
