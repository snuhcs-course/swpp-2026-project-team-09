/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { TutorialCategory, TutorialQuest } from '@/api/tutorial-types';
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

export const TUTORIAL_CONTENT: readonly TutorialContent[] = [...FIRST_QUESTS, ...LAST_QUESTS];
