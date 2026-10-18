/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { ShuttleService } from '../../shuttle/shuttle.service.js';
import { defineTool, noneFound, type Tool } from '../feature.js';
import { koreaTime } from '../korea-time.js';

// The circular shuttle's vehicles the operator reports now, each at the stop it is at, in the loop order of their
// stops, with when they were collected. Or "none" with the reason: the operator reports no vehicle, or no position was
// collected in the last minute. It never answers older positions.
export function getShuttle(shuttle: ShuttleService): Tool {
  return defineTool({
    description:
      "Where the campus circular shuttle's vehicles are now, as the operator reports them: each vehicle at its stop, with when the positions were collected (collectedAt, Korean time). Answers result 'none' with the reason when no vehicle is reported.",
    input: z.object({}),
    run: async () => {
      const vehicles = await shuttle.reportedVehicles();
      if (vehicles === null) {
        return noneFound(
          'No position of the shuttle was collected in the last minute, so where it is now is not known. It is collected only while the shuttle runs, on weekdays in its service hours.',
        );
      }
      const [first] = vehicles;
      if (first === undefined) {
        return noneFound('The operator reports no shuttle running now.');
      }
      return {
        result: 'found',
        collectedAt: koreaTime(new Date(first.receivedAt)),
        vehicles: vehicles.map(({ carId, stop }) => ({ vehicle: carId, stop: stop.name })),
      };
    },
  });
}
