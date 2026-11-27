/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// What the app tells the main server it can draw, with every chat request: library cards, an answer on the map, the
// study spaces of the visible area it sends as `viewport`, a meet, the answers of events, recruiting parties, and a new
// party, 바꾸기 / 그대로 두기 beside a Quest already set (`plan-set`, P04 ticket 17), which it also sends with POST /plans
// and POST /assistant/answers, a Quest cancelled by words (`quest-cancel`, ticket 24), and a 파티 changed in place
// (`party-change`, ticket 25), a Place or a time picked (`pick`, ticket 26), and a study answer alone, the places to
// study as candidates (`study-plan`, P10 ticket 23). The 1.0.0 bundle sends none of them.
// A main server before P05 ticket 17 refuses `plan-set`, one before P05 ticket 31 `quest-cancel`, one before P05
// ticket 30 `party-change`, and one before P05 ticket 24 `pick`.
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
  'study-plan',
] as const;
