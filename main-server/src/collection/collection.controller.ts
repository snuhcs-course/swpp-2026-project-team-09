/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-01  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type Settings } from '../common/settings.js';
import { WorkerOnly } from '../common/worker-only.decorator.js';
import { GlobalSettings } from '../global-settings/global-settings.service.js';
import {
  type BooleanSetting,
  extraSnuCollectionSetting,
  switchDefaultsOf,
} from '../global-settings/registered-settings.js';
import { CollectionService } from './collection.service.js';
import { type CollectionFailedMessage, collectionFailedSchema } from './dto/collection-failed.dto.js';
import {
  type CollectionScheduledAnswer,
  type CollectionScheduledQuestion,
  collectionScheduledSchema,
} from './dto/collection-scheduled.dto.js';

@Controller('collections')
export class CollectionController {
  private readonly extraSnu: BooleanSetting;

  constructor(
    private readonly collection: CollectionService,
    private readonly globalSettings: GlobalSettings,
    settings: ConfigService<Settings, true>,
  ) {
    this.extraSnu = extraSnuCollectionSetting(switchDefaultsOf(settings));
  }

  // Whether the worker's schedule collects the Source now: extra.snu's while collection.extraSnu is on, and every other
  // Source always, as they have no switch.
  @Post('scheduled')
  @WorkerOnly()
  @HttpCode(HttpStatus.OK)
  scheduled(
    @Body({ schema: collectionScheduledSchema }) { source }: CollectionScheduledQuestion,
  ): CollectionScheduledAnswer {
    return { scheduled: source !== 'extra_snu' || this.globalSettings.get(this.extraSnu) };
  }

  @Post('failed')
  @WorkerOnly()
  @HttpCode(HttpStatus.NO_CONTENT)
  async failed(
    @Body({ schema: collectionFailedSchema }) { source, failedAt, reason }: CollectionFailedMessage,
  ): Promise<void> {
    await this.collection.recordFailure(source, new Date(failedAt), reason);
  }
}
