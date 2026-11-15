/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { friendLabels } from '../src/friends/friend-label.js';

// One label per Friend of the viewer, unique among them all.

// A Friend: name, department, and when the friendship began in Korea; then the label's name and aside.
type Row = [name: string, department: string, acceptedAt: string, labelName: string, aside: string | null];

const OCT_3 = '2026-10-03T14:05:00';

const CASES: [string, Row[]][] = [
  [
    'the given name when no other Friend has it, and a name of other than three syllables whole',
    [
      ['김민수', '컴퓨터공학부', OCT_3, '민수', null],
      ['박지은', '경영학과', OCT_3, '지은', null],
      ['남궁민준', '경영학과', OCT_3, '남궁민준', null],
      ['Alex Kim', '경영학과', OCT_3, 'Alex Kim', null],
    ],
  ],
  [
    'the full name when another Friend has the given name',
    [
      ['김민수', '컴퓨터공학부', OCT_3, '김민수', null],
      ['이민수', '경영학과', OCT_3, '이민수', null],
      ['박지은', '경영학과', OCT_3, '지은', null],
    ],
  ],
  [
    'the full name of two syllables beside one of three that ends in it',
    [
      ['김수', '컴퓨터공학부', OCT_3, '김수', null],
      ['박김수', '경영학과', OCT_3, '박김수', null],
    ],
  ],
  [
    'the given name of four syllables beside one of three, which already differ',
    [
      ['남궁민수', '컴퓨터공학부', OCT_3, '남궁민수', null],
      ['김민수', '경영학과', OCT_3, '민수', null],
    ],
  ],
  [
    'the department aside when another Friend has the full name',
    [
      ['김민수', '컴퓨터공학부', OCT_3, '김민수', '컴퓨터공학부'],
      ['김민수', '경영학과', OCT_3, '김민수', '경영학과'],
      ['이민수', '경영학과', OCT_3, '이민수', null],
    ],
  ],
  [
    'since which day aside when another has the full name and the department',
    [
      ['김민수', '경영학과', OCT_3, '김민수', '10월 3일부터 친구'],
      ['김민수', '경영학과', '2026-11-02T09:00:00', '김민수', '11월 2일부터 친구'],
    ],
  ],
  [
    'the day in Korea, which is not the day in UTC',
    [
      ['김민수', '경영학과', '2026-10-03T00:30:00', '김민수', '10월 3일부터 친구'],
      ['김민수', '경영학과', '2026-10-02T23:50:00', '김민수', '10월 2일부터 친구'],
    ],
  ],
  [
    'the time too when the two friendships began on the same day',
    [
      ['김민수', '경영학과', OCT_3, '김민수', '10월 3일 14:05부터 친구'],
      ['김민수', '경영학과', '2026-10-03T18:30:00', '김민수', '10월 3일 18:30부터 친구'],
    ],
  ],
  [
    'the same label for two that began in the same minute',
    [
      ['김민수', '경영학과', '2026-10-03T14:05:10', '김민수', '10월 3일 14:05부터 친구'],
      ['김민수', '경영학과', '2026-10-03T14:05:50', '김민수', '10월 3일 14:05부터 친구'],
    ],
  ],
  [
    'names and departments compared without spaces and case',
    [
      ['Alex Kim', '경영학과', OCT_3, 'Alex Kim', '경영학과'],
      ['alexkim', '컴퓨터공학부', OCT_3, 'alexkim', '컴퓨터공학부'],
      ['김민수', '경영학과', OCT_3, '김민수', '10월 3일부터 친구'],
      ['김민수', '경영 학과', '2026-10-09T10:00:00', '김민수', '10월 9일부터 친구'],
    ],
  ],
  [
    'the final check: two of different departments with the same day move to the time',
    [
      ['김민수', '경영학과', OCT_3, '김민수', '10월 3일 14:05부터 친구'],
      ['김민수', '경영학과', '2026-10-05T10:00:00', '김민수', '10월 5일부터 친구'],
      ['김민수', '컴퓨터공학부', '2026-10-03T18:30:00', '김민수', '10월 3일 18:30부터 친구'],
      ['김민수', '컴퓨터공학부', '2026-10-07T10:00:00', '김민수', '10월 7일부터 친구'],
    ],
  ],
  [
    'the final check: a department that reads as a day moves down together with the day',
    [
      ['김민수', '10월 3일부터 친구', '2026-11-01T10:00:00', '김민수', '11월 1일부터 친구'],
      ['김민수', '경영학과', OCT_3, '김민수', '10월 3일 14:05부터 친구'],
      ['김민수', '경영학과', '2026-10-09T10:00:00', '김민수', '10월 9일부터 친구'],
    ],
  ],
];

describe('A Friend reads', () => {
  it.each(CASES)('%s', (_case, rows) => {
    const friends = rows.map(([name, department, acceptedAt], at) => ({
      id: `friend-${at}`,
      name,
      department,
      acceptedAt: new Date(`${acceptedAt}+09:00`),
    }));

    const labels = friendLabels(friends);

    expect(labels).toEqual(
      new Map(rows.map(([, , , name, aside], at) => [`friend-${at}`, { text: name, name, aside }])),
    );
  });

  it('nothing when the viewer has no Friend', () => {
    expect(friendLabels([])).toEqual(new Map());
  });
});
