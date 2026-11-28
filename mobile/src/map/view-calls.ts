/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// expo-modules-core rejects a call on a view tag that has no view any more. Android's `ViewNotFound` keeps its code
// through the call's wrappers. iOS wraps it in an argument cast, whose code the call takes, and keeps its words:
// "Unable to find the 'SnuNowMapView' view with tag '211'" (Android: "… the class ….SnuNowMapView view with tag 211").
const GONE_CODE = 'ERR_VIEW_NOT_FOUND';
const GONE_WORDS = /Unable to find the (?:class )?'?[\w.]*SnuNowMapView'? view with tag/u;

function viewGone(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }
  return ('code' in error && error.code === GONE_CODE) || GONE_WORDS.test(error.message);
}

// A call sent to the map module's view (`moveCamera`, `fitTo`), or none when there is no view. A call made as the
// native view goes, as when a change of the font size recreates Android's Activity before the JavaScript view
// unmounts, is rejected; there is nothing left to move, so that rejection is taken. Any other is kept: a caller that
// does not wait leaves it unhandled, and it is reported as every unhandled rejection is (P04 ticket 95).
export function sentToView(call?: Promise<void>): Promise<void> {
  return (call ?? Promise.resolve()).catch((error: unknown) => {
    if (!viewGone(error)) {
      throw error;
    }
  });
}
