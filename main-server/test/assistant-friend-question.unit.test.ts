/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ClientCapability, type Presented } from '../src/assistant/feature.js';
import { FoundIds } from '../src/assistant/found-ids.js';
import { type Lookup } from '../src/assistant/dto/answer.dto.js';
import {
  answeredBy,
  askedBy,
  askWhichFriend,
  type FriendCandidate,
  friendQuestion,
} from '../src/assistant/refusals/friend-question.js';
import { type Refusal } from '../src/assistant/refusals/refusal.dto.js';

// The question of which Friend the User meant (P01-20): its two lines from the User's words, how many Friends they fit
// and the tool they were found for, a cell for each candidate, and when the reply carries it. Friends chosen by hand.

const kim: FriendCandidate = { id: 'kim', name: '김민수', department: '컴퓨터공학부' };
const lee: FriendCandidate = { id: 'lee', name: '이민수', department: '경영학과' };

const textsOf = ({ lines }: Refusal): string[] => lines.map((line) => line.map(({ text }) => text).join(''));

const firstLine = (words: string, count: number): string | undefined =>
  textsOf(friendQuestion(words, count, [kim, lee], null))[0];

const secondLine = (tool: string | null): string | undefined => textsOf(friendQuestion('민수', 2, [kim, lee], tool))[1];

const nothingPresented = (): Presented => ({
  mapButtons: [],
  cards: [],
  proposal: null,
  answer: null,
  lookup: null,
  refusal: null,
});

const LOOKUP: Lookup = {
  kind: 'way',
  chips: [],
  lines: [],
  basis: [],
  scene: { people: [], places: [], routes: [], flags: [] },
  band: null,
  actions: [],
};

const drawing = (presented: Presented): { capabilities: Set<ClientCapability>; presented: Presented } => ({
  capabilities: new Set(['library', 'answer']),
  presented,
});

describe("The question's first line", () => {
  it("says the User's words with 가 after a vowel and 이 after a final consonant", () => {
    expect(firstLine('민수', 2)).toBe('민수가 두 명이에요.');
    expect(firstLine('김민수', 2)).toBe('김민수가 두 명이에요.');
    expect(firstLine('지은', 2)).toBe('지은이 두 명이에요.');
  });

  it('counts in words up to 열, and in digits past it', () => {
    expect([3, 4, 5, 9, 10].map((count) => firstLine('민수', count))).toEqual([
      '민수가 세 명이에요.',
      '민수가 네 명이에요.',
      '민수가 다섯 명이에요.',
      '민수가 아홉 명이에요.',
      '민수가 열 명이에요.',
    ]);
    expect(firstLine('민수', 11)).toBe('민수가 11명이에요.');
  });
});

describe("The question's second line", () => {
  it('fits a meal, a meet, and any other tool or none', () => {
    expect(secondLine('planMeal')).toBe('누구와 먹을까요?');
    expect(secondLine('planMeet')).toBe('누구와 만날까요?');
    expect(secondLine('findFriend')).toBe('누구인가요?');
    expect(secondLine(null)).toBe('누구인가요?');
  });
});

describe("The question's cells", () => {
  it('are one per candidate in order: the full name, the department beside it, and the full name as the words', () => {
    expect(friendQuestion('민수', 2, [kim, lee], 'planMeal')).toEqual({
      kind: 'which-friend',
      lines: [[{ text: '민수가 두 명이에요.', strong: false }], [{ text: '누구와 먹을까요?', strong: false }]],
      offers: [
        { kind: 'pick-friend', userId: 'kim', label: '김민수', aside: '컴퓨터공학부', text: '김민수' },
        { kind: 'pick-friend', userId: 'lee', label: '이민수', aside: '경영학과', text: '이민수' },
      ],
    });
  });

  it('leave the department out of every line, and the aside empty for a Friend who gave none', () => {
    const question = friendQuestion('민수', 2, [kim, { ...lee, department: '' }], null);
    expect(textsOf(question).join('')).not.toMatch(/컴퓨터공학부|경영학과/u);
    expect(question.offers[1]).toMatchObject({ aside: null });
  });
});

describe('The reply', () => {
  const question = friendQuestion('민수', 2, [kim, lee], null);

  it('carries the question for an app that draws answers', () => {
    const presented = nothingPresented();
    expect(askWhichFriend(drawing(presented), question)).toBe(true);
    expect(presented.refusal).toBe(question);
  });

  it('carries none for an app that does not draw answers, nor beside a Lookup', () => {
    const older = nothingPresented();
    expect(askWhichFriend({ capabilities: new Set(['library']), presented: older }, question)).toBe(false);
    const beside = { ...nothingPresented(), lookup: LOOKUP };
    expect(askWhichFriend(drawing(beside), question)).toBe(false);
    expect([older.refusal, beside.refusal]).toEqual([null, null]);
  });

  it('asks for a meal once planMeal is given a Friend of the several, and not for a Friend named alone', () => {
    const found = new FoundIds();
    found.contest('friend', ['kim', 'lee']);
    found.settle('friend', 'jieun');
    const presented = { ...nothingPresented(), refusal: question };
    askedBy('planMeal', ['jieun'], found, presented);
    expect(textsOf(presented.refusal)[1]).toBe('누구인가요?');
    askedBy('planMeal', ['jieun', 'lee'], found, presented);
    expect(textsOf(presented.refusal)[1]).toBe('누구와 먹을까요?');
  });

  it('drops the question once a later answer names one of its candidates alone, and keeps it for another Friend', () => {
    const presented = { ...nothingPresented(), refusal: question };
    answeredBy('jieun', presented);
    expect(presented.refusal).toBe(question);
    answeredBy('lee', presented);
    expect(presented.refusal).toBeNull();
  });
});
