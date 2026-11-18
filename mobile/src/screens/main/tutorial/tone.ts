/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Tutorial } from '@/api/tutorial-types';
import { type TutorialCategoryTone, tutorialCategoryTones } from '@/design-system';

// A Tutorial Category's colours, by its place in the tutorial's categories: 생활 orange, 공부·학사 blue, 이동 violet,
// 건강 green, 문화·여가 pink, as the canvas's boards draw them. A quest without a category takes the first.
export function toneOf(tutorial: Tutorial, category: string | undefined): TutorialCategoryTone {
  const at = Math.max(
    0,
    tutorial.categories.findIndex(({ key }) => key === category),
  );
  return tutorialCategoryTones[at % tutorialCategoryTones.length] ?? tutorialCategoryTones[0];
}
