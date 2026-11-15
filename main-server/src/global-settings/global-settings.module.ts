/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Global, Module } from '@nestjs/common';
import { GlobalSettings } from './global-settings.service.js';
import { REGISTERED_SETTINGS, SETTING_REGISTRY } from './registered-settings.js';

// Makes GlobalSettings available to every feature. AppModule starts the scheduler that runs its minute check.
@Global()
@Module({
  providers: [GlobalSettings, { provide: SETTING_REGISTRY, useValue: REGISTERED_SETTINGS }],
  exports: [GlobalSettings],
})
export class GlobalSettingsModule {}
