/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  editMentions,
  friendsMatching,
  insertMention,
  mentionParts,
  mentionQuery,
  mentionsOf,
  type MentionedText,
  placedIn,
} from '@/features/assistant/mentions';

// The "@" mention of Friends in the AI input: when "@" opens the list, what the words after it match, what a press
// puts in, and how a backspace takes a mention away.

const MIN_SU_CS = { userId: 'a', name: '김민수', department: '컴퓨터공학부' };
const MIN_SU_BIZ = { userId: 'b', name: '김민수', department: '경영학과' };
const JI_WOO = { userId: 'c', name: '서지우', department: '심리학과' };
const FRIENDS = [MIN_SU_CS, MIN_SU_BIZ, JI_WOO];

function plain(text: string): MentionedText {
  return { text, placed: [] };
}

// The words typed, then a Friend chosen from the list the last "@" opened.
function chosen(state: MentionedText, friend: { userId: string; name: string }): MentionedText {
  const query = mentionQuery(state, state.text.length);
  if (query === null) {
    throw new Error('No "@" is being typed');
  }
  return insertMention(state, { start: query.start, cursor: state.text.length }, friend).state;
}

describe('the "@" being typed', () => {
  it('is none in words without "@"', () => {
    expect(mentionQuery(plain('민수랑 밥'), 5)).toBeNull();
  });

  it('is none for an "@" inside a word, as in an e-mail address', () => {
    expect(mentionQuery(plain('mail me@snu'), 11)).toBeNull();
  });

  it('starts at an "@" at the start or after a space, with the words up to the cursor', () => {
    expect(mentionQuery(plain('@'), 1)).toEqual({ start: 0, query: '' });
    expect(mentionQuery(plain('밥 @민'), 4)).toEqual({ start: 2, query: '민' });
  });

  it('is none once a line breaks after it', () => {
    expect(mentionQuery(plain('@민\n수'), 4)).toBeNull();
  });

  it('is none inside a mention already put in', () => {
    const state = chosen(plain('@'), JI_WOO);

    expect(mentionQuery(state, 2)).toBeNull();
  });
});

describe('the Friends the words match', () => {
  it('are every Friend for a bare "@"', () => {
    expect(friendsMatching(FRIENDS, '')).toEqual(FRIENDS);
  });

  it('are those whose name holds the words, ignoring case', () => {
    expect(friendsMatching(FRIENDS, '지')).toEqual([JI_WOO]);
    expect(friendsMatching([{ name: 'Alex Kim' }], 'alex k')).toEqual([{ name: 'Alex Kim' }]);
  });

  it('keep two Friends of one name both, for their departments to tell apart', () => {
    expect(friendsMatching(FRIENDS, '민수')).toEqual([MIN_SU_CS, MIN_SU_BIZ]);
  });

  it('are none when a space follows a name no Friend has', () => {
    expect(friendsMatching(FRIENDS, '민수 ')).toEqual([]);
  });
});

describe('a Friend chosen', () => {
  it('puts "@이름 " in place of what was typed, the cursor after the space', () => {
    const { state, cursor } = insertMention(plain('밥 @민 먹자'), { start: 2, cursor: 4 }, MIN_SU_BIZ);

    expect(state.text).toBe('밥 @김민수  먹자');
    expect(cursor).toBe(7);
    expect(mentionsOf(state)).toEqual([{ userId: 'b', name: '김민수' }]);
  });

  it('is one of several mentions in a message, and the same Friend twice counts once', () => {
    let state = chosen(plain('@'), MIN_SU_CS);
    state = chosen({ ...state, text: `${state.text}랑 @` }, JI_WOO);
    state = chosen({ ...state, text: `${state.text}@` }, MIN_SU_CS);

    expect(state.text).toBe('@김민수 랑 @서지우 @김민수 ');
    expect(mentionsOf(state)).toEqual([
      { userId: 'a', name: '김민수' },
      { userId: 'c', name: '서지우' },
    ]);
    expect(mentionParts(state).filter(({ mention }) => mention)).toHaveLength(3);
  });
});

describe('an edit of the words', () => {
  it('takes the whole mention away with one backspace at its end', () => {
    const state = chosen(plain('밥 @'), MIN_SU_CS);

    const edited = editMentions(state, '밥 @김민수');

    expect(edited).toEqual({ state: { text: '밥 ', placed: [] }, cursor: 2, whole: true });
  });

  it('takes the whole mention away with a backspace inside it, and moves the mentions after it', () => {
    let state = chosen(plain('@'), MIN_SU_CS);
    state = chosen({ ...state, text: `${state.text}@` }, JI_WOO);

    const edited = editMentions(state, '@김민 @서지우 ');

    expect(edited.state.text).toBe('@서지우 ');
    expect(mentionsOf(edited.state)).toEqual([{ userId: 'c', name: '서지우' }]);
    expect(edited.cursor).toBe(0);
  });

  it('keeps a mention when words are typed after it', () => {
    const state = chosen(plain('@'), JI_WOO);

    const edited = editMentions(state, '@서지우 랑');

    expect(mentionsOf(edited.state)).toEqual([{ userId: 'c', name: '서지우' }]);
    expect(edited).toMatchObject({ cursor: 6, whole: false });
  });

  it('leaves the words of a mention as plain words when an edit replaces part of it', () => {
    const state = chosen(plain('@'), JI_WOO);

    const edited = editMentions(state, '@서지민 ');

    expect(edited.state.text).toBe('@서지민 ');
    expect(mentionsOf(edited.state)).toEqual([]);
  });

  it('drops a mention whose words are no longer there, as when the field is emptied', () => {
    const state = chosen(plain('@'), JI_WOO);

    expect(mentionsOf({ ...state, text: '' })).toEqual([]);
  });
});

describe('a sent message shown back', () => {
  it('finds each mention of its Friends, the longer name first, and nothing inside a word', () => {
    const mentions = [
      { userId: 'x', name: '김민' },
      { userId: 'a', name: '김민수' },
    ];

    const parts = mentionParts({ text: '@김민수 랑 a@김민', placed: placedIn('@김민수 랑 a@김민', mentions) });

    expect(parts).toEqual([
      { words: '@김민수', mention: true },
      { words: ' 랑 a@김민', mention: false },
    ]);
  });
});
