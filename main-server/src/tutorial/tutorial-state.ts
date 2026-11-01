/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// What the app shows of the tutorial, from the User's progress. Each time of the progress is read only as set or not,
// never compared with another, since each is set or cleared only by its own rule (TutorialService).

export type TutorialState = 'finished' | 'stopped' | 'off' | 'active' | 'available';

export type QuestStatus = 'notStarted' | 'started' | 'completed';

export interface Progress {
  enabledAt: Date | null;
  stoppedAt: Date | null;
  finishedAt: Date | null;
}

export interface QuestProgress {
  questKey: string;
  completedAt: Date | null;
}

export function questStatus(progress: QuestProgress | undefined): QuestStatus {
  if (progress === undefined) {
    return 'notStarted';
  }
  return progress.completedAt === null ? 'started' : 'completed';
}

// The first that holds. `progress` is null for a User without a row; `questKeys` are the content's keys, so that a
// started quest no longer in the content does not count.
export function tutorialState(
  progress: Progress | null,
  quests: readonly QuestProgress[],
  questKeys: readonly string[],
): TutorialState {
  if (progress !== null && progress.finishedAt !== null) {
    return 'finished';
  }
  if (progress !== null && progress.stoppedAt !== null) {
    return 'stopped';
  }
  if (progress === null || progress.enabledAt === null) {
    return 'off';
  }
  return quests.some(({ questKey }) => questKeys.includes(questKey)) ? 'active' : 'available';
}

// The year in Korea at `at`.
function koreaYear(at: Date): number {
  return Number(new Intl.DateTimeFormat('en', { timeZone: 'Asia/Seoul', year: 'numeric' }).format(at));
}

// Freshmen of this year or later and exchange students get the tutorial without turning it on.
export function eligibleByDefault(
  user: { admissionYear: number | null; affiliation: string | null },
  at: Date,
): boolean {
  return (user.admissionYear !== null && user.admissionYear >= koreaYear(at)) || user.affiliation === 'exchange';
}
