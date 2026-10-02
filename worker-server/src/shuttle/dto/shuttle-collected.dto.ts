export const SHUTTLE_SOURCES = ['shuttle_stops', 'shuttle_vehicles'] as const;

export type ShuttleSource = (typeof SHUTTLE_SOURCES)[number];

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

// A vehicle as the operator reports it: its `carid` and its position on the drawing, in pixels.
export interface Vehicle {
  carId: string;
  x: number;
  y: number;
}

// What one Collection of the vehicle positions read, sent to the main server as `shuttle-vehicles-collected`.
export interface ShuttleVehiclesCollectedMessage {
  source: 'shuttle_vehicles';
  // When the operator's answer arrived. The answer carries no time of its own.
  collectedAt: string;
  vehicles: Vehicle[];
}
