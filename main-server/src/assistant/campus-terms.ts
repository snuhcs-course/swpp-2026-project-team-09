/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// The short names people on campus use for places and things, a fragment of the chat's system prompt of its own
// (ADR 0009). It is data: a name is added by adding one entry, and campusTermsRules renders the list. The list only
// tells the model what a name stands for; menus, hours and locations still come from tool results. Each meaning names
// the Places and Restaurants as the tools find them (main-server/seed/campus-map-places.json, national-map-places.json,
// restaurant-places.json and the shuttle stops), checked on 2026-11-18.

export interface CampusTerm {
  // What people say, the most common first.
  readonly shortNames: readonly string[];
  // What they mean, by the names the tools find.
  readonly means: string;
  readonly note?: string;
}

export const CAMPUS_TERMS: readonly CampusTerm[] = [
  { shortNames: ['학관'], means: '학생회관 (63동)' },
  {
    shortNames: ['윗공대'],
    means:
      'the College of Engineering buildings around 300동–303동: 유회진 학술정보관 (300동), 제1공학관 (301동), 제2공학관 (302동) and 해동첨단공학관 (303동)',
    note: 'The highest part of campus and the farthest from the main gate. An area, not one building.',
  },
  {
    shortNames: ['아랫공대'],
    means:
      'the College of Engineering buildings in the lower part of campus, around 30동–44동, and 신소재공동연구소 (131동); among them 공학관1 (30동), 대학원연구동(1단계) (39동), and 데이터사이언스대학원 및 공과대학 강의동 1 (43동)',
    note: 'Said to tell it from 윗공대. An area, not one building.',
  },
  {
    shortNames: ['과방'],
    means: "a department's own room for resting and studying",
    note: "Usually in the department's building, but some departments have none or have it elsewhere. The app has no data on 과방: say so, and do not name a room.",
  },
  { shortNames: ['버들골', '풍산마당'], means: '버들골 풍산마당 (100동)' },
  {
    shortNames: ['긱사', '긱'],
    means: '기숙사, which is 관악사 (the dormitories)',
    note: 'An area of many buildings, not one.',
  },
  {
    shortNames: ['천식'],
    means: '천원의 식사, the 1,000-won meal',
  },
  { shortNames: ['종운'], means: '종합운동장' },
  { shortNames: ['긱운'], means: '기숙사 운동장, which is 관악사운동장' },
  { shortNames: ['긱삼'], means: '기숙사삼거리', note: 'A stop of the shuttle; no Place has this name.' },
  { shortNames: ['중도'], means: '중앙도서관' },
];

function lineOf({ shortNames, means, note }: CampusTerm): string {
  return `- ${shortNames.join(', ')}: ${means}.${note === undefined ? '' : ` ${note}`}`;
}

// The fragment: what the list is for, the list, and what to do with a short name that is not in it.
export function campusTermsRules(terms: readonly CampusTerm[]): string {
  return `Short names people on campus use, so that you know what the User means by them. Read such a name in the User's message as what it stands for, then look that up with your tools as you would any other name: the list gives no facts to answer from. For a name in the list, what it stands for counts as the User's words as written, and the tools' rules for several or none apply to it as to any other name. Answer in the User's own words, such as 중도 to a User who wrote 중도.

${terms.map((term) => lineOf(term)).join('\n')}

Most other short names cut a long building name short or join first syllables. When one is not in the list and the tools find several or none for it, ask the User which place they mean instead of guessing; for such a name, this comes before saying that nothing matches.`;
}

export const CAMPUS_TERMS_RULES = campusTermsRules(CAMPUS_TERMS);
