/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { screen } from './app';
import type { openMain } from './main';

type User = Awaited<ReturnType<typeof openMain>>;

// The map screen's chip of the conversation kept while the answer is closed (P04 ticket 11): "이어서, {question}", with
// ", 새 답 있음" while a reply came meanwhile.
export const CONTINUE = /^이어서, /u;

// Brings the closed answer back as it was: a press on the chip (P04 ticket 33).
export async function reopenAnswer(user: User): Promise<void> {
  await user.press(screen.getByRole('button', { name: CONTINUE }));
}
