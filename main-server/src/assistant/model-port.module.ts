/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Module } from '@nestjs/common';
import { MODEL_FACTORY_PROVIDER, ModelPort } from './model-port.js';

// The model port, one for the Assistant and the Judgement alike, so that the models of the keys are built once.
@Module({
  providers: [MODEL_FACTORY_PROVIDER, ModelPort],
  exports: [ModelPort],
})
export class ModelPortModule {}
