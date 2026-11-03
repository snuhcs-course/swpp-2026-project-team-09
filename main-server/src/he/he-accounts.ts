/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// The seven accounts of the Heuristic Evaluation (P15), which exist only on the HE branch. With HE_ACCOUNTS on, an ID
// token equal to a key signs in as its account (src/auth/he-stand-in.ts). The app keeps its own copy of the keys.

export type HeRole = 'round-1' | 'round-2' | 'spare';

export interface HeAccount {
  // Sent in place of Google's ID token, and kept as the User's Google subject.
  key: string;
  role: HeRole;
  name: string;
  department: string;
  // As an SNU account's Google name reads, so that Onboarding suggests the name and the department.
  googleName: string;
}

function account(key: string, role: HeRole, name: string, department: string): HeAccount {
  return { key, role, name, department, googleName: `${name} / 학생 / ${department}` };
}

// In the order of the spec's table, which the app's list follows.
export const HE_ACCOUNTS: readonly HeAccount[] = [
  account('he-r1a', 'round-1', '김하늘', '컴퓨터공학부'),
  account('he-r1b', 'round-1', '최유나', '심리학과'),
  account('he-r2a', 'round-2', '한지우', '산업공학과'),
  account('he-r2b', 'round-2', '정민재', '경제학부'),
  account('he-s1', 'spare', '이도현', '경영학과'),
  account('he-s2', 'spare', '박서진', '기계공학부'),
  account('he-s3', 'spare', '오세린', '생명과학부'),
];
