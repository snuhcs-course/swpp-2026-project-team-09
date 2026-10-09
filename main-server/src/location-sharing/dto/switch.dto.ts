/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { z } from 'zod';

// Turns a switch of Location Sharing on or off: the Master Switch, or a relationship's at the User's end.
export const switchSchema = z.strictObject({ on: z.boolean() });

export type SwitchDto = z.infer<typeof switchSchema>;
