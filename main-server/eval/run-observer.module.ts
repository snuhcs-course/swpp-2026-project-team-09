/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type DynamicModule, Module } from '@nestjs/common';
import { RUN_OBSERVER, type RunObserver } from '../src/assistant/adapter.js';

@Module({})
class RunObserverModule {}

// The module that gives the Assistant the benchmark's run observer, which `startApp` imports beside AppModule. Global,
// so that AssistantModule sees it without importing it.
export function runObserverModule(observer: RunObserver): DynamicModule {
  return {
    module: RunObserverModule,
    global: true,
    providers: [{ provide: RUN_OBSERVER, useValue: observer }],
    exports: [RUN_OBSERVER],
  };
}
