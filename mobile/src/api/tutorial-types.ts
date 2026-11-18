/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { LatLng } from './types';

// The 새내기 튜토리얼 as the main server serves it (`GET /tutorial`, P06 spec "Endpoints"): the content of
// `main-server/content/tutorial.yaml` with the User's progress, as `TutorialDto` of `main-server/src/tutorial/dto`.
// The app keeps no copy of the text: every word a screen shows of a quest comes from here.

// Derived by the main server, the first that holds: `finished`, `stopped`, `off`, `active`, `available`.
export type TutorialState = 'off' | 'available' | 'active' | 'stopped' | 'finished';

export type TutorialQuestStatus = 'notStarted' | 'started' | 'completed';

// How a quest was completed. `button` only for a quest served as a button quest; the other three only for the 관정
// quest while the main server serves it as `kwanjeongCheck` (LIBRARY_BOOKING_ENABLED and TUTORIAL_KWANJEONG_CHECK on).
export type TutorialCompletedBy = 'button' | 'checked' | 'forced' | 'skipped';

export type TutorialCompletion = { kind: 'button' } | { kind: 'kwanjeongCheck'; skipLabel: string };

// A Place of the shared seed by its number ("62-1"), with the floor, or a point with its words. `label`, on a Place,
// is the words to show in place of its name: Place 4 is shown as "우리은행 (4동)".
export type TutorialPlace = { place: string; floor?: number; label?: string } | { point: LatLng; label: string };

export interface TutorialLink {
  label: string;
  url: string;
}

// A Tutorial Category: one of the groups the quests are shown in (생활, 공부·학사, …). Its quests come one after
// another in `order`.
export interface TutorialCategory {
  key: string;
  label: string;
}

// A guide's place: a Place of the shared seed by its number, or a point.
export type TutorialGuidePlace = { place: string } | { point: LatLng };

// A fact of a step in a few words after its icon, by the icon's name (`TUTORIAL_ICONS` of the main server).
export interface TutorialChip {
  icon: string;
  words: string;
}

// A row of an online step; a row with `url` opens it.
export interface TutorialRow {
  words: string;
  note?: string;
  url?: string;
}

// A step's button: 길찾기 to its place, a site, or words sent to the Assistant.
export type TutorialAction =
  | { kind: 'route'; words: string }
  | { kind: 'link'; words: string; url: string }
  | { kind: 'ask'; words: string; ask: string };

// One of several places of a step, a chip each, with its pin if it has a Place.
export interface TutorialSpot {
  name: string;
  sub?: string;
  place?: TutorialGuidePlace;
  chips?: TutorialChip[];
}

// One step of a guide on the map (`main-server/src/tutorial/tutorial-guide.ts`).
export interface TutorialStep {
  tab: string;
  title: string;
  optional?: boolean;
  about?: string[];
  place?: TutorialGuidePlace;
  name?: string;
  sub?: string;
  showName?: boolean;
  pinText?: string;
  link?: { words: string; url: string };
  rows?: TutorialRow[];
  chips?: TutorialChip[];
  actions?: TutorialAction[];
  spots?: TutorialSpot[];
}

// A kind to choose before the steps, such as 일반 학생증.
export interface TutorialKind {
  key: string;
  label: string;
  icon: string;
  title: string;
  route: string[];
  steps: TutorialStep[];
}

// A quest's guide on the map, which the app opens in place of its sheet: `steps`, or `kinds` to choose first.
// `together`: its steps are places side by side, any of which completes the quest.
export interface TutorialGuide {
  together?: boolean;
  about?: string[];
  withoutUser?: boolean;
  steps?: TutorialStep[];
  kinds?: TutorialKind[];
}

export interface TutorialQuest {
  key: string;
  order: number;
  // The key of its Tutorial Category.
  category?: string;
  // The icon of its row in the list and of its guide's bar, by name; left out by an older main server.
  icon?: string;
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
  // What 어시스턴트에게 예약 부탁하기 sends; the sheet shows the button only for a quest with it.
  ask?: string;
  // Left out by an older main server: the quest then opens its sheet.
  guide?: TutorialGuide;
  status: TutorialQuestStatus;
}

export interface Tutorial {
  state: TutorialState;
  // The ✕ of the 내 정보 row was pressed while the tutorial was `off`; turning the tutorial on clears it.
  rowHidden: boolean;
  // The main server's rule, read now: admitted this year in Korea or later, or 소속 교환학생. The app has no copy of it.
  eligibleByDefault: boolean;
  // In the order they are shown.
  categories: TutorialCategory[];
  // In `order`.
  quests: TutorialQuest[];
}
