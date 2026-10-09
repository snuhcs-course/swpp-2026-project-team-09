// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import type { LatLng } from './types';

// --- Shuttle (GET /shuttle, GET /shuttle/vehicles, the socket's shuttle-vehicles-updated) ---

export interface ShuttleStop {
  id: string;
  // The operator's name, "정문".
  name: string;
  latitude: number;
  longitude: number;
}

// The circular route 41946.
export interface ShuttleRoute {
  // The route page's text about the service hours, a line for each line of the page.
  serviceHours: string;
  // In loop order from 정문, which is the line's direction.
  stops: ShuttleStop[];
  // Along the roads from 정문 around the loop back to 정문.
  line: LatLng[];
}

// A vehicle in service at the stop the operator last reported it at. `receivedAt` is when the worker received the
// report.
export interface ShuttleVehicle {
  carId: string;
  stop: ShuttleStop;
  receivedAt: string;
}
