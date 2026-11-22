/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// A Place or a time asked back (P04 ticket 26), sent only to an app that says `pick`. `pick-place` turns the map into
// picking: a tap on a building sends `text` as the User's words with that Place tapped. `pick-time` opens a time wheel
// on `date` ("YYYY-MM-DD"), the asker's Free Time that day marked from `from` to `until` ("HH:MM", "24:00" for the end
// of the day): a pick sends "HH:MM에" as the User's words.
export interface PickPlaceOffer {
  kind: 'pick-place';
  label: string;
  text: string;
}

export interface PickTimeOffer {
  kind: 'pick-time';
  label: string;
  date: string;
  free: { from: string; until: string }[];
}

export type PickOffer = PickPlaceOffer | PickTimeOffer;
