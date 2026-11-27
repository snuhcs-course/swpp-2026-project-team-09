/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// What the app tells the main server it can draw, with every chat request: library cards, an answer on the map, the
// study spaces of the visible area it sends as `viewport`, a meet, the answers of events, recruiting parties, and a new
// party, 바꾸기 / 그대로 두기 beside a Quest already set (`plan-set`, P04 ticket 17), which it also sends with POST /plans
// and POST /assistant/answers, a Quest cancelled by words (`quest-cancel`, ticket 24), and a 파티 changed in place
// (`party-change`, ticket 25), a Place or a time picked (`pick`, ticket 26), and a study answer together
// (`study-group`, P10 ticket 16). The 1.0.0 bundle sends none of them. A main server before P05 ticket 17 refuses
// `plan-set`, one before P05 ticket 31 `quest-cancel`, one before P05 ticket 30 `party-change`, one before P05 ticket
// 24 `pick`, and one before P10 ticket 07 (#643) `study-group`.
export const ANSWER_CAPABILITIES = [
  'library',
  'answer',
  'area',
  'meet',
  'events',
  'plan-set',
  'quest-cancel',
  'party-change',
  'pick',
  'study-group',
] as const;

// Whether the app tells the main server it keeps a reply's answers by key (`answers`, P03 ticket 20): it then sends the
// steps on screen and their answers' conditions. Not yet: a main server before P05 tickets 73 and 74 refuses them.
export const saysAnswers = (ANSWER_CAPABILITIES as readonly string[]).includes('answers');
