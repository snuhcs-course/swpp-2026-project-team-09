// A vehicle as the operator reports it: its `carid` and its position on the drawing, in pixels.
export interface Vehicle {
  carId: string;
  x: number;
  y: number;
}

// What one Collection of the vehicle positions read, posted to the main server's `/shuttle/vehicles/collected`.
export interface ShuttleVehiclesCollectedMessage {
  source: 'shuttle_vehicles';
  // When the operator's answer arrived.
  collectedAt: string;
  vehicles: Vehicle[];
}
