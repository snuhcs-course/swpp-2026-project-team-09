/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';

// A save from the Settings page: the value as text, which GlobalSettings.save checks against the setting.
export const saveSettingSchema = z.strictObject({ value: z.string().max(1000) });

export type SaveSettingDto = z.infer<typeof saveSettingSchema>;
