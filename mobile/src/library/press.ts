/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// The mark of a card's confirm button. A write is accepted only with one, so that no write leaves the phone without
// the User's press.
export class ConfirmedPress {
  readonly pressedAt = Date.now();
}

export function confirmedPress(): ConfirmedPress {
  return new ConfirmedPress();
}
