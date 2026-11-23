/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { addedLineOf, addingWordsOf } from '@/features/assistant/adding-words';

// The main button's words when the plans add Friends to the meal the User holds (P05 ticket 44). Partitions: one
// Friend whose name ends in a final consonant, one whose name does not, several; the start kept, the start moved.
const AT = '2026-11-23T12:30:00+09:00';

describe('the words of a press that adds Friends', () => {
  it('names one Friend with 이 after a final consonant', () => {
    expect(addingWordsOf({ friends: [{ userId: 'u1', name: '지은' }], startAt: AT, movesTo: null })).toBe(
      '지은이 초대 보내기',
    );
  });

  it('names one Friend alone after a vowel, and several joined', () => {
    expect(addingWordsOf({ friends: [{ userId: 'u1', name: '하나' }], startAt: AT, movesTo: null })).toBe(
      '하나 초대 보내기',
    );
    const two = [
      { userId: 'u1', name: '지은' },
      { userId: 'u2', name: '하은' },
    ];
    expect(addingWordsOf({ friends: two, startAt: AT, movesTo: null })).toBe('지은, 하은 초대 보내기');
  });

  it('says the move first when the start moves', () => {
    const movesTo = '2026-11-23T12:58:00+09:00';
    expect(addingWordsOf({ friends: [{ userId: 'u1', name: '지은' }], startAt: AT, movesTo })).toBe(
      '12:58로 옮기고 지은이 초대 보내기',
    );
  });
});

// Partitions: the start kept, the start moved, several Friends (the line after the press).
describe('the line once the press added Friends', () => {
  it('says the invitation went', () => {
    expect(addedLineOf({ friends: [{ userId: 'u1', name: '지은' }], startAt: AT, movesTo: null }, '점심')).toBe(
      '지은에게 초대를 보냈어요',
    );
  });

  it('says the move and the invitation when the start moved, for several Friends', () => {
    const two = [
      { userId: 'u1', name: '지은' },
      { userId: 'u2', name: '하은' },
    ];
    expect(addedLineOf({ friends: two, startAt: AT, movesTo: '2026-11-23T12:58:00+09:00' }, '점심')).toBe(
      '점심을 12:58로 옮기고 지은, 하은에게 초대를 보냈어요',
    );
  });
});
