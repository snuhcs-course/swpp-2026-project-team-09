import { z } from 'zod';
import { type Vehicle } from './dto/shuttle-collected.dto.js';

// `{"d":"row;row;…"}`
const answerSchema = z.object({ d: z.string() });

function rows(text: string): string[] {
  try {
    return answerSchema.parse(JSON.parse(text)).d.split(';');
  } catch {
    throw new Error("The answer is not the operator's vehicle positions");
  }
}

function coordinate(field: string | undefined): number | null {
  return field === undefined || field.trim() === '' || !Number.isFinite(Number(field)) ? null : Number(field);
}

// Reads the operator's answer of vehicle positions. Each row is `carid/x/y/count/plates/code`; the count and the plates
// describe everything at that position, not one vehicle, and are left out.
export function parseVehiclePositions(text: string): Vehicle[] {
  return (
    rows(text)
      // An empty answer is one empty row.
      .filter((row) => row !== '')
      .map((row) => {
        const [carId = '', x, y] = row.split('/');
        const position = { x: coordinate(x), y: coordinate(y) };
        if (carId === '' || position.x === null || position.y === null) {
          throw new Error(`The answer has a row without a vehicle: ${row}`);
        }
        return { carId, x: position.x, y: position.y };
      })
  );
}
