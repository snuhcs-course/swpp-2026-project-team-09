/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type Tool } from '../feature.js';
import {
  LIBRARY_ANSWER_RULES,
  LIBRARY_GROUP_RULES,
  LIBRARY_RULES,
  LIBRARY_STUDY_GROUP_RULES,
  LIBRARY_STUDY_RULES,
} from '../library/library-rules.js';
import { type LibraryServices } from '../library/library-tools.js';
import { type LookupServices } from '../lookup/lookup-services.js';
import { withStudyGroup } from '../lookup/study-group-tools.js';
import { withStudyPlan } from '../lookup/study-plan-tools.js';
import { withStudyArea } from '../lookup/study-tools.js';

// What the chat offers for studying, by what the app draws: the visible area's study spaces (`area`), ranked study
// places (`study-plan`, which take 근처 in the place of `area`'s), and the answer together (`study-group`, in the place
// of proposeStudyRoom); and the 관정도서관 rules that go with them.

export interface StudyDrawing {
  drawsAnswers: boolean;
  drawsArea: boolean;
  drawsStudy: boolean;
  drawsStudyGroup: boolean;
}

export function studyDrawingOf(options?: Partial<StudyDrawing>): StudyDrawing {
  const drawsAnswers = options?.drawsAnswers ?? false;
  return {
    drawsAnswers,
    drawsArea: drawsAnswers && options?.drawsArea === true,
    drawsStudy: drawsAnswers && options?.drawsStudy === true,
    drawsStudyGroup: drawsAnswers && options?.drawsStudyGroup === true,
  };
}

export function withStudies(
  planned: { rules: string[]; tools: Record<string, Tool> },
  { lookups, library }: { lookups: LookupServices; library: LibraryServices },
  { drawsArea, drawsStudy, drawsStudyGroup }: StudyDrawing,
): { rules: string[]; tools: Record<string, Tool> } {
  return withStudyGroup(
    withStudyPlan(
      withStudyArea(planned, lookups.studyAreas, drawsArea && !drawsStudy),
      lookups.studyPlans,
      drawsStudy,
      drawsStudyGroup,
    ),
    lookups.studyGroups,
    library,
    drawsStudyGroup,
  );
}

// The 관정도서관 rules: with a study answer, "공부할 자리" asked without a booking is planStudy's; with the answer
// together, studying together is planStudyGroup's.
export function libraryRulesOf({ drawsAnswers, drawsStudy, drawsStudyGroup }: StudyDrawing): string {
  if (!drawsAnswers) {
    return LIBRARY_RULES;
  }
  if (drawsStudyGroup) {
    return drawsStudy ? LIBRARY_STUDY_GROUP_RULES : LIBRARY_GROUP_RULES;
  }
  return drawsStudy ? LIBRARY_STUDY_RULES : LIBRARY_ANSWER_RULES;
}
