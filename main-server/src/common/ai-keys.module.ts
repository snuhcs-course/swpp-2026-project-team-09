/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_KEYS, type AiKeys, aiKeysOf } from './llm-keys.js';
import { type Settings } from './settings.js';

// The AI's keys, read once from the settings ConfigModule checked: the one list the registry of global settings and the
// model port both take.
@Global()
@Module({
  providers: [
    {
      provide: AI_KEYS,
      inject: [ConfigService],
      useFactory: (settings: ConfigService<Settings, true>): AiKeys =>
        aiKeysOf({
          OPENROUTER_API_KEY: settings.get('OPENROUTER_API_KEY', { infer: true }),
          LLM_KEYS: settings.get('LLM_KEYS', { infer: true }),
        }),
    },
  ],
  exports: [AI_KEYS],
})
export class AiKeysModule {}
