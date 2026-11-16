/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// The Quests the User is leaving or ending on this phone. Their disappearance from the list is the User's own doing,
// and is not told. It imports nothing, so that any flow that removes the User from a Quest may mark it without
// pulling the app's client and screens into its imports.
const leaving = new Set<string>();

// Runs the User's own leave or end of a Quest. While it runs and once it is taken, the Quest leaving the list is not
// told; when it is refused, the mark is dropped, so that a removal by the Leader later is still told.
export async function leavingOnPurpose(questId: string, leave: () => Promise<boolean>): Promise<boolean> {
  leaving.add(questId);
  const left = await leave();
  if (!left) {
    leaving.delete(questId);
  }
  return left;
}

// Whether the Quest went by the User's own doing; the mark is used up.
export function leftOnPurpose(questId: string): boolean {
  return leaving.delete(questId);
}
