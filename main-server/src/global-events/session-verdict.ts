/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// What the step may do with a session of a Judgement, from its checks. Only a publishable session is published (ADR
// 0008). A comparable one is compared with the events that exist, and attached only on narrow terms (ADR 0014). A
// draftable one fills its Draft with what was read. A check missing from the results fails.

interface CheckResult {
  name: string;
  passed: boolean;
}

// By name, so that a check added later counts towards publication only, until it is added here.
const COMPARABLE = [
  'announcesEvent',
  'linesInPost',
  'dateAgrees',
  'weekdayAgrees',
  'timeAgrees',
  'notApplicationPeriod',
  'startBeforeEnd',
  'hasTimeOfDay',
  'newSession',
];

const TIME = [
  'dateAgrees',
  'weekdayAgrees',
  'timeAgrees',
  'notApplicationPeriod',
  'startBeforeEnd',
  'hasTimeOfDay',
  'length',
];

const PLACE = ['placeInLines', 'placeMatches'];

export interface SessionVerdict {
  publishable: boolean;
  comparable: boolean;
  draftable: boolean;
  // Which halves of what was read a Draft may take.
  timeRead: boolean;
  placeRead: boolean;
  blockedBy: string[];
}

export function verdictOf(checks: CheckResult[]): SessionVerdict {
  const passes = (names: string[]): boolean =>
    names.every((name) => checks.some((check) => check.name === name && check.passed));
  const blockedBy = checks.filter(({ passed }) => !passed).map(({ name }) => name);
  const comparable = passes(COMPARABLE);
  const timeRead = passes(TIME);
  const placeRead = passes(PLACE);
  return {
    publishable: blockedBy.length === 0 && comparable && timeRead && placeRead,
    comparable,
    draftable: passes(['linesInPost']) && (timeRead || placeRead),
    timeRead,
    placeRead,
    blockedBy,
  };
}
