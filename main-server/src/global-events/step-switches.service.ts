/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_KEYS, type AiKeys } from '../common/llm-keys.js';
import { Settings } from '../common/settings.js';
import { GlobalSettings } from '../global-settings/global-settings.service.js';
import {
  switchDefaultsOf,
  stepSwitchSettings,
  type StepSwitchSettings,
} from '../global-settings/registered-settings.js';
import { type StepSwitches } from './session-comparison.js';

export interface CurrentSwitches {
  // Whether the step asks the model about the Drafts the rules left.
  readonly judges: boolean;
  readonly switches: StepSwitches;
}

// The switches of the step after a Collection as they are now. Judgements, the title rule and the AI's choice are
// global settings an Administrator switches on the admin site, with the env settings of the same name as their
// defaults; AUTOMATIC_PUBLICATION stays an env setting. A caller reads them once for what it does, so that a change
// applies from its next run and never halfway through one.
@Injectable()
export class StepSwitchesService {
  private readonly publishes: boolean;
  private readonly settings: StepSwitchSettings;

  constructor(
    private readonly globalSettings: GlobalSettings,
    @Inject(AI_KEYS) keys: AiKeys,
    settings: ConfigService<Settings, true>,
  ) {
    this.publishes = settings.get('AUTOMATIC_PUBLICATION', { infer: true });
    this.settings = stepSwitchSettings(switchDefaultsOf(settings), keys);
  }

  current(): CurrentSwitches {
    return {
      judges: this.globalSettings.get(this.settings.judgement),
      switches: {
        publishes: this.publishes,
        comparesTitles: this.globalSettings.get(this.settings.titleRule),
        choosesByAi: this.globalSettings.get(this.settings.aiChoice),
      },
    };
  }
}
