/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-29  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { useAiRaised } from '../shell/ai-raised';
import type { TutorialFlow } from './tutorial/use-tutorial-flow';

// Whether the bar's middle lowered the AI (A04 ticket 09): its input and the lines over it go, and what stood over them
// comes down (ticket 12). Only on the everyday map: an answer frame hides the bar, and its card keeps its input; nor
// while the 새내기 튜토리얼's list or a quest's sheet is open, which keep the input as they show it.
export function useLowered(framed: boolean, tutorial: Pick<TutorialFlow, 'list' | 'sheet'>): boolean {
  return !useAiRaised().raised && !framed && tutorial.list === null && tutorial.sheet === null;
}
