/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { isTutorialGuide } from '@/api/server/tutorial-guide-answers';
import type { TutorialCategory, TutorialGuide, TutorialQuest } from '@/api/tutorial-types';
import guides from './tutorial-guides.json';
import { FIRST_QUESTS } from './tutorial-quests-first';
import { LAST_QUESTS } from './tutorial-quests-last';

// The mock's stand-in for `main-server/content/tutorial.yaml`: the P13 spec's fifteen quests in its five Tutorial
// Categories, with the file's texts and without its facts, so that the mock answers `GET /tutorial` as the main server
// does. The screens never read this file: they show what the client answers. The 관정 quest is as the file holds it,
// `kwanjeongCheck`; the mock serves it as the main server does (src/api/mock/tutorial.ts).
export type TutorialContent = Omit<TutorialQuest, 'status'>;

export const TUTORIAL_CATEGORIES: readonly TutorialCategory[] = [
  { key: 'life', label: '생활' },
  { key: 'study', label: '공부·학사' },
  { key: 'transit', label: '이동' },
  { key: 'health', label: '건강' },
  { key: 'culture', label: '문화·여가' },
];

// Each quest's icon and guide, copied whole from the file into `tutorial-guides.json` and checked as the client checks
// the server's answer. `main-server/test/tutorial-mock-copy.unit.test.ts` fails once the copy drifts from the file.
function guideOf(key: string): { icon?: string; guide?: TutorialGuide } {
  const copy: unknown = Reflect.get(guides, key);
  const icon: unknown = Reflect.get(copy ?? {}, 'icon');
  const guide: unknown = Reflect.get(copy ?? {}, 'guide');
  if (typeof icon !== 'string' || !isTutorialGuide(guide)) {
    throw new Error(`The stored guide of ${key} fails the check of an answer`);
  }
  return { icon, guide };
}

export const TUTORIAL_CONTENT: readonly TutorialContent[] = [...FIRST_QUESTS, ...LAST_QUESTS].map((quest) =>
  Object.assign({}, quest, guideOf(quest.key)),
);
