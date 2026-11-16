/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Global, Module } from '@nestjs/common';
import { AI_KEYS, type AiKeys } from '../common/llm-keys.js';
import { AdminSettingsController } from './admin-settings.controller.js';
import { GlobalSettings } from './global-settings.service.js';
import { registeredSettings, SETTING_REGISTRY } from './registered-settings.js';
import { type SettingDefinition } from './registry.js';

// Makes GlobalSettings available to every feature, and serves the admin site's Settings page. AppModule starts the
// scheduler that runs its minute check.
@Global()
@Module({
  controllers: [AdminSettingsController],
  providers: [
    GlobalSettings,
    {
      provide: SETTING_REGISTRY,
      inject: [AI_KEYS],
      useFactory: (keys: AiKeys): SettingDefinition[] => registeredSettings(keys),
    },
  ],
  exports: [GlobalSettings],
})
export class GlobalSettingsModule {}
