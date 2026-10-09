/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// A stop of the route page, at its place on the operator's drawing of the route, in pixels.
export interface RouteStop {
  name: string;
  left: number;
  top: number;
}

// What one Collection of the route page read, posted to the main server's `/shuttle/stops/collected`.
export interface ShuttleStopsCollectedMessage {
  source: 'shuttle_stops';
  collectedAt: string;
  stops: RouteStop[];
  serviceHours: string;
}
