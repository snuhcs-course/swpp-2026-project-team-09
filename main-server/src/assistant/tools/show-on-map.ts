/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { defineTool, MAP_LAYERS, type Tool } from '../feature.js';

const input = z.object({
  layer: z.enum(MAP_LAYERS).describe('dining for the restaurants, shuttle for the circular shuttle.'),
});

// The first presenter: it puts a button under the reply that shows a layer of the map, rather than the model
// describing the map in words. A layer shown twice gets one button.
export function showOnMap(): Tool {
  return defineTool({
    description:
      'Adds a button under your reply that closes the chat and shows a layer on the map: dining, the restaurants, after an answer about menus; shuttle, the circular shuttle, after an answer about the shuttle.',
    input,
    run: ({ layer }, { presented }) => {
      if (!presented.mapButtons.includes(layer)) {
        presented.mapButtons.push(layer);
      }
      return Promise.resolve({ result: 'shown', layer });
    },
  });
}
