/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-25  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { ShownAnswer } from '@/features/assistant/use-shown-answer';

function nothing(): void {
  // A stub's action does nothing.
}

// The answer a hook sees with nothing on screen, for tests that hand a hook the answer shown themselves.
export const NO_ANSWER: ShownAnswer = {
  source: null,
  answer: null,
  plan: null,
  frame: null,
  index: 0,
  browse: nothing,
  show: nothing,
  chooseKind: nothing,
  basisOpen: false,
  toggleBasis: nothing,
  adding: false,
  setAdding: nothing,
  picked: null,
  asked: null,
  pickOrder: null,
  keepPickOrder: nothing,
  pick: nothing,
  finishPicking: nothing,
  recalculating: false,
  change: nothing,
  again: nothing,
  add: nothing,
  pendingAdd: null,
  undo: null,
  moving: null,
  setMoving: nothing,
  menuFor: null,
  openMenu: nothing,
  closeMenu: nothing,
};
