/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-03  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// The accounts of the Heuristic Evaluation (P15), which exist only on the HE branch. The app keeps its own copy of the
// keys, since the two share no code.

export type HeRole = 'round-1' | 'round-2' | 'spare';

// A meeting of a Class: its start, its end when it is not 75 minutes later, and the campus map's number of its Place.
export interface HeMeeting {
  course: string;
  start: string;
  end?: string;
  place: string;
}

// Monday repeats Wednesday's Classes and Tuesday Thursday's. The weekend is empty.
export interface HeTimetable {
  wednesday: HeMeeting[];
  thursday: HeMeeting[];
  friday: HeMeeting[];
}

export interface HeAccount {
  // Sent in place of Google's ID token, and kept as the User's Google subject.
  key: string;
  role: HeRole;
  name: string;
  department: string;
  // As an SNU account's Google name reads, so that Onboarding suggests the name and the department.
  googleName: string;
  // On a reserved domain (RFC 2606) that no mail reaches. The app never shows it.
  email: string;
  // Fixed, so that the hosts can keep them on a sheet.
  friendId: string;
  // A round account's starting Friends, two of the spares drawn at random once, on 2026-11-03. A spare's are the round
  // accounts that name it.
  friends: string[];
  timetable: HeTimetable;
}

function account(fields: Omit<HeAccount, 'googleName' | 'email'>): HeAccount {
  const { key, name, department } = fields;
  return { ...fields, googleName: `${name} / 학생 / ${department}`, email: `${key}@he.invalid` };
}

// The spec's tables, in their order, which the app's list follows.
export const HE_ACCOUNT_LIST: readonly HeAccount[] = [
  account({
    key: 'he-r1a',
    role: 'round-1',
    name: '김하늘',
    department: '컴퓨터공학부',
    friendId: 'HERA2345',
    friends: ['he-s2', 'he-s3'],
    timetable: {
      wednesday: [
        { course: '알고리즘', start: '11:00', place: '302' },
        { course: '공학수학2', start: '16:00', end: '16:50', place: '301' },
      ],
      thursday: [
        { course: '자료구조', start: '09:30', place: '301' },
        { course: '운영체제', start: '14:00', place: '302' },
      ],
      friday: [{ course: '공학수학2', start: '16:00', end: '16:50', place: '301' }],
    },
  }),
  account({
    key: 'he-r1b',
    role: 'round-1',
    name: '최유나',
    department: '심리학과',
    friendId: 'HERB2345',
    friends: ['he-s2', 'he-s3'],
    timetable: {
      wednesday: [{ course: '심리학개론', start: '11:00', place: '16' }],
      thursday: [
        { course: '사회심리학', start: '12:30', place: '16' },
        { course: '심리통계', start: '15:30', place: '83' },
      ],
      friday: [{ course: '심리학실험', start: '10:00', end: '11:50', place: '16' }],
    },
  }),
  account({
    key: 'he-r2a',
    role: 'round-2',
    name: '한지우',
    department: '산업공학과',
    friendId: 'HERC2345',
    friends: ['he-s2', 'he-s3'],
    timetable: {
      wednesday: [
        { course: '확률모형', start: '14:00', place: '43-1' },
        { course: '생산관리', start: '17:00', place: '43-1' },
      ],
      thursday: [
        { course: '경영과학', start: '11:00', place: '301' },
        { course: '공학경제', start: '15:30', place: '43-1' },
      ],
      friday: [{ course: '산업공학세미나', start: '13:00', end: '13:50', place: '43' }],
    },
  }),
  account({
    key: 'he-r2b',
    role: 'round-2',
    name: '정민재',
    department: '경제학부',
    friendId: 'HERD2345',
    friends: ['he-s1', 'he-s3'],
    timetable: {
      wednesday: [{ course: '미시경제이론', start: '12:30', place: '16' }],
      thursday: [
        { course: '거시경제이론', start: '09:30', place: '16' },
        { course: '경제수학', start: '14:00', place: '83' },
      ],
      friday: [{ course: '경제사', start: '11:00', place: '16' }],
    },
  }),
  account({
    key: 'he-s1',
    role: 'spare',
    name: '이도현',
    department: '경영학과',
    friendId: 'HESA2345',
    friends: [],
    timetable: {
      wednesday: [
        { course: '회계원리', start: '11:00', place: '58' },
        { course: '마케팅관리', start: '15:30', place: '58' },
      ],
      thursday: [{ course: '조직행동론', start: '12:30', place: '59' }],
      friday: [],
    },
  }),
  account({
    key: 'he-s2',
    role: 'spare',
    name: '박서진',
    department: '기계공학부',
    friendId: 'HESB2345',
    friends: [],
    timetable: {
      wednesday: [
        { course: '열역학', start: '09:30', place: '301' },
        { course: '기계공학실험', start: '17:00', end: '19:50', place: '301' },
      ],
      thursday: [
        { course: '유체역학', start: '11:00', place: '301' },
        { course: '동역학', start: '12:30', place: '302' },
      ],
      friday: [{ course: '공학수학1', start: '09:00', end: '09:50', place: '43-1' }],
    },
  }),
  account({
    key: 'he-s3',
    role: 'spare',
    name: '오세린',
    department: '생명과학부',
    friendId: 'HESC2345',
    friends: [],
    timetable: {
      wednesday: [
        { course: '생물학', start: '09:30', place: '24' },
        { course: '화학', start: '11:00', place: '26' },
      ],
      thursday: [{ course: '생물학실험', start: '14:00', end: '16:50', place: '24' }],
      friday: [{ course: '대학글쓰기', start: '10:00', end: '10:50', place: '1' }],
    },
  }),
];
