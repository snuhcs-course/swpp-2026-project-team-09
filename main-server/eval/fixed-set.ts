/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

// The fixed set: P19's 62 cases by category, which every later change to the chat is compared on (spec P04,
// "Regression"). New suites add cases beside them, so a test checks that these are all there, each once, rather than
// pinning a count of every case.
export const FIXED_SET: Readonly<Record<string, readonly string[]>> = {
  menus: [
    'menus-today-lunch',
    'menus-tomorrow-breakfast',
    'menus-today-dinner-restaurant',
    'menus-tomorrow-whole-day',
    'menus-abbreviation-hakgwan',
  ],
  shuttle: ['shuttle-where-now', 'shuttle-near-stop', 'shuttle-how-many'],
  'global-events': [
    'global-events-this-week-shows',
    'global-events-tonight-talk',
    'global-events-weekend-festival',
    'global-events-thursday',
    'global-events-career-this-week',
  ],
  'finding-parties': [
    'finding-parties-no-condition',
    'finding-parties-exercise',
    'finding-parties-tomorrow-meal',
    'finding-parties-study',
    'finding-parties-for-event',
  ],
  'making-parties': [
    'making-parties-lunch-with-friend',
    'making-parties-breakfast-by-building-number',
    'making-parties-open-dinner',
    'making-parties-approval-tennis',
    'making-parties-for-event',
    'making-parties-abbreviation-hakgwan',
    'making-parties-friday-dinner',
  ],
  'missing-or-ambiguous-target': [
    'ask-which-minsu',
    'ask-which-same-name-friend',
    'ask-which-festival-event',
    'ask-which-engineering-building',
    'ask-missing-time',
    'ask-lunch-already-past',
    'ask-unknown-friend',
    'ask-missing-fields-in-one-question',
  ],
  'ambiguous-intent': [
    'ambiguous-intent-lunch-at-student-center',
    'ambiguous-intent-festival-company',
    'ambiguous-intent-basketball-tomorrow',
    'ambiguous-intent-jazz-concert',
  ],
  'no-data': [
    'no-data-menus-day-after-tomorrow',
    'no-data-restaurant-breakfast',
    'no-data-events-day-after-tomorrow',
    'no-data-meal-parties-day-after-tomorrow',
  ],
  'out-of-scope': [
    'out-of-scope-report',
    'out-of-scope-code',
    'out-of-scope-library-seats',
    'out-of-scope-where-is-friend',
  ],
  'small-talk': ['small-talk-greeting', 'small-talk-tired', 'small-talk-meal-recommendation-asks-taste'],
  'follow-ups': [
    'follow-up-chosen-minsu',
    'follow-up-second-same-name-friend',
    'follow-up-seven-oclock',
    'follow-up-narrow-to-weekend',
    'follow-up-make-instead',
    'follow-up-yes-after-menus',
  ],
  live: ['live-lunch-then-seven', 'live-which-minsu', 'live-menus-then-tomorrow'],
  compound: [
    'compound-menus-and-shuttle',
    'compound-this-week-menus',
    'compound-festival-and-party',
    'compound-proposal-two-friends-place-event',
    'compound-exercise-or-make',
  ],
};
