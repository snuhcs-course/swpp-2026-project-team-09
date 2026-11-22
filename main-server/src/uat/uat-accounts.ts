/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 * 2026-11-23  Fable 5.2  prompted by AhnJinYoung
 ******************************************************************************/

// The accounts of the User Acceptance Test (cycle 2) on swpp-a, which exist only on this branch. A1 to A3 are the
// testers', one each; B and D are the helpers' phones; C and E only hold data. The app keeps its own copy of the keys,
// since the two share no code.

export const TESTER_LETTERS = ['A1', 'A2', 'A3'] as const;
export type Tester = (typeof TESTER_LETTERS)[number];
export type Letter = Tester | 'B' | 'C' | 'D' | 'E';

export interface UatAccount {
  // Sent in place of Google's ID token, and kept as the User's Google subject.
  key: string;
  // The UAT sheet's letter.
  letter: Letter;
  name: string;
  department: string;
  // As an SNU account's Google name reads.
  googleName: string;
  // On a reserved domain (RFC 2606) that no mail reaches. The app never shows it.
  email: string;
  // Fixed, so that the host can keep them on a sheet.
  friendId: string;
}

function account(fields: Omit<UatAccount, 'googleName' | 'email'>): UatAccount {
  const { key, name, department } = fields;
  return { ...fields, googleName: `${name} / 학생 / ${department}`, email: `${key}@uat.invalid` };
}

// No name is part of another, since the Assistant finds a Friend by a part of the name.
export const UAT_ACCOUNT_LIST: readonly UatAccount[] = [
  account({ key: 'uat-a1', letter: 'A1', name: '김서연', department: '컴퓨터공학부', friendId: 'UATA2345' }),
  account({ key: 'uat-a2', letter: 'A2', name: '정하윤', department: '화학부', friendId: 'UATA3456' }),
  account({ key: 'uat-a3', letter: 'A3', name: '최민준', department: '기계공학부', friendId: 'UATA4567' }),
  account({ key: 'uat-b', letter: 'B', name: '이도현', department: '경영학과', friendId: 'UATB2345' }),
  account({ key: 'uat-c', letter: 'C', name: '박지호', department: '심리학과', friendId: 'UATC2345' }),
  account({ key: 'uat-d', letter: 'D', name: '한지우', department: '국어국문학과', friendId: 'UATD2345' }),
  account({ key: 'uat-e', letter: 'E', name: '윤서아', department: '통계학과', friendId: 'UATE2345' }),
];

export function accountOf(letter: Letter): UatAccount {
  const found = UAT_ACCOUNT_LIST.find((one) => one.letter === letter);
  if (found === undefined) {
    throw new Error(`No UAT account ${letter}`);
  }
  return found;
}
