// A stop of the route page, at its place on the operator's drawing of the route, in pixels.
export interface RouteStop {
  name: string;
  left: number;
  top: number;
}

// What one Collection of the route page read, sent to the main server as `shuttle-stops-collected`.
export interface ShuttleStopsCollectedMessage {
  source: 'shuttle_stops';
  collectedAt: string;
  // In loop order.
  stops: RouteStop[];
  // As the page writes them.
  serviceHours: string;
}
