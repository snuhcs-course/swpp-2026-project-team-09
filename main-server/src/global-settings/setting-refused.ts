/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// A save of a global setting refused: an unregistered name, a value of the wrong type or not allowed, or the caller's
// own check. `reason` says why, for the Settings page to show.
export class SettingRefused extends Error {
  constructor(readonly reason: string) {
    super(reason);
  }
}
