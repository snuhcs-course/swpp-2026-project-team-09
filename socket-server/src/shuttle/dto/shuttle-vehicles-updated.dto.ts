// AI-generated with Claude Opus 5.5, 2026-10-04, prompted by TaeHyun79, reviewed by fyoon46 in #31
// A vehicle at the stop the operator reports, as the main server sends it once it has stored a set of positions.
export interface ShuttleVehicle {
  carId: string;
  stop: { id: string; name: string; latitude: number; longitude: number };
  // ISO 8601. The app drops a vehicle whose position is more than a minute old.
  receivedAt: string;
}
