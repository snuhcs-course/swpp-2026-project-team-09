/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LatLng } from './types';

// The 새내기 튜토리얼 as the main server serves it (`GET /tutorial`, P06 spec "Endpoints"): the content of
// `main-server/content/tutorial.yaml` with the User's progress. The app keeps no copy of the text: every word a
// screen shows of a quest comes from here. Provisional: the main server's routes are ticket P06-02's.

// Derived by the main server, the first that holds: `finished`, `stopped`, `off`, `active`, `available`.
export type TutorialState = 'off' | 'available' | 'active' | 'stopped' | 'finished';

export type TutorialQuestStatus = 'notStarted' | 'started' | 'completed';

// How a quest was completed. `button` only for a button quest; the other three only for the 관정 quest.
export type TutorialCompletedBy = 'button' | 'checked' | 'forced' | 'skipped';

export type TutorialCompletion = { kind: 'button' } | { kind: 'kwanjeongCheck'; skipLabel: string };

// A Place of the shared seed by its number ("62-1"), with the floor, or a point with its words. `label`, on a Place,
// is the words to show in place of its name: Place 4 is shown as "우리은행 (4동)".
export type TutorialPlace = { place: string; floor?: number; label?: string } | { point: LatLng; label: string };

export interface TutorialLink {
  label: string;
  url: string;
}

export interface TutorialQuest {
  key: string;
  order: number;
  title: string;
  // The pager's line.
  brief: string;
  // The sheet's text, one paragraph each.
  body: string[];
  // 완료 조건.
  condition: string;
  completion: TutorialCompletion;
  // What the sheet's Assistant bubble says once the quest is completed.
  completionMessage: string;
  places: TutorialPlace[];
  links: TutorialLink[];
  status: TutorialQuestStatus;
}

export interface Tutorial {
  state: TutorialState;
  // In `order`.
  quests: TutorialQuest[];
  // The ✕ of the 내 정보 row was pressed while the tutorial was `off` (`rowHiddenAt`). The app's own: the spec's
  // body has no field for it yet, and an answer without it shows the row.
  rowHidden?: boolean;
}
