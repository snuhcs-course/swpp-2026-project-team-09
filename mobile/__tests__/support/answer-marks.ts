/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLabel, AnswerSymbol } from '@/design-system';
import type { AnswerDrawing, AnswerThing } from '@/features/assistant/answer-marks';

export const ME_ID = '11ca538e-e4ef-48d9-9a1f-b7160c553bee';
export const MINSU_ID = '35976b5c-4daf-454f-b10e-c8b09a33ca37';
export const JIEUN_ID = 'a4c0f6de-2b7e-4c57-9d3a-5e8f1b2c7d90';
export const NEXT_CLASS = 'answer:next:055a68b1-3f09-5ea7-a98f-6f5febf1c6af';

export interface Seen {
  name: string;
  symbol: AnswerSymbol | null;
  label: AnswerLabel | null;
  planId: string | null;
}

function thingOf(drawing: AnswerDrawing, id: string): AnswerThing {
  const thing = drawing.things.find((one) => one.id === id);
  if (thing === undefined) {
    throw new Error(`The drawing has no thing ${id}`);
  }
  return thing;
}

// What a thing of the drawing shows: its name, and the symbol and the label of its look.
export function seen(drawing: AnswerDrawing, id: string): Seen {
  const { name, look, planId } = thingOf(drawing, id);
  if (look.kind !== 'answer') {
    throw new Error(`The thing ${id} has no answer look`);
  }
  return { name, symbol: look.symbol, label: look.label, planId };
}

export function sideOf(drawing: AnswerDrawing, id: string): string | null {
  return seen(drawing, id).label?.side ?? null;
}

export function label(
  side: AnswerLabel['side'],
  tone: AnswerLabel['tone'],
  title: string,
  more: { line?: string; number?: number } = {},
): AnswerLabel {
  return { side, tone, title, line: more.line ?? null, number: more.number ?? null };
}
