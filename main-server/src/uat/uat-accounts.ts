/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Fable 5.2  prompted by TaeHyun79
 ******************************************************************************/

// The accounts of the User Acceptance Test on swpp-a, which exist only on this branch: A is the tester's, B and C the
// team's. The app keeps its own copy of the keys, since the two share no code.

export interface UatAccount {
  // Sent in place of Google's ID token, and kept as the User's Google subject.
  key: string;
  // The UAT sheet's letter.
  letter: 'A' | 'B' | 'C';
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

export const UAT_ACCOUNT_LIST: readonly UatAccount[] = [
  account({ key: 'uat-a', letter: 'A', name: '김서연', department: '컴퓨터공학부', friendId: 'UATA2345' }),
  account({ key: 'uat-b', letter: 'B', name: '이도현', department: '경영학과', friendId: 'UATB2345' }),
  account({ key: 'uat-c', letter: 'C', name: '박지호', department: '심리학과', friendId: 'UATC2345' }),
];
