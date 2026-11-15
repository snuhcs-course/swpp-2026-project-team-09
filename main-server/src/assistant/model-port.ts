/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AI_KEYS, type AiKey, type AiKeys, type LlmProvider, MODEL_IDS, PROVIDER_NAMES } from '../common/llm-keys.js';
import { type ModelCache, type Settings } from '../common/settings.js';
import { GlobalSettings } from '../global-settings/global-settings.service.js';
import { llmKeySetting, type LlmKeySetting } from '../global-settings/registered-settings.js';
import { anthropicModel, loggedModel, type Model, openRouterModel } from './adapter.js';

// The model port (spec A02, "The model port"): one model for each of the AI's keys, built at start, and the one the
// global setting `llm.key` names. The chat and the Judgement ask for it once per answer, the same-event choice once per
// call, so that an answer never mixes two keys.

// The model through `provider`, with its key and model id. The cache mode is the Anthropic path's only; OpenRouter's
// requests cache nothing. The evaluations call it with their own key and flags; only they and the tests pass a fetch.
export function modelThrough(
  provider: LlmProvider,
  apiKey: string,
  modelId: string,
  cache: ModelCache,
  fetch?: typeof globalThis.fetch,
): Model {
  return provider === 'anthropic'
    ? anthropicModel(apiKey, modelId, cache, fetch)
    : openRouterModel(apiKey, modelId, fetch);
}

// Builds the model of one key. The server binds the real one; the tests bind one that answers with a ScriptedModel.
export const MODEL_FACTORY = 'MODEL_FACTORY';

export type ModelFactory = (key: Pick<AiKey, 'name' | 'provider' | 'apiKey'>) => Model;

export const MODEL_FACTORY_PROVIDER = {
  provide: MODEL_FACTORY,
  inject: [ConfigService],
  useFactory: (settings: ConfigService<Settings, true>): ModelFactory => {
    const cache = settings.get('MODEL_CACHE', { infer: true });
    return ({ provider, apiKey }) => modelThrough(provider, apiKey, MODEL_IDS[provider], cache);
  },
};

// The model of the key an answer uses, with that key's name and provider for the log.
export interface ChosenModel {
  readonly keyName: string;
  readonly provider: LlmProvider;
  readonly model: Model;
}

@Injectable()
export class ModelPort {
  private readonly logger = new Logger(ModelPort.name);
  private readonly models = new Map<string, ChosenModel>();

  private readonly setting: LlmKeySetting;

  constructor(
    private readonly globalSettings: GlobalSettings,
    @Inject(MODEL_FACTORY) factory: ModelFactory,
    @Inject(AI_KEYS) keys: AiKeys,
  ) {
    const { offered, unknown } = keys;
    this.setting = llmKeySetting(keys);
    for (const name of unknown) {
      this.logger.warn(`The AI's key ${name} is not offered: its value names no provider (sk-ant- or sk-or-)`);
    }
    for (const key of offered) {
      const describe = `key ${key.name} on ${PROVIDER_NAMES[key.provider]}`;
      const model = loggedModel(factory(key), describe, (line) => {
        this.logger.log(line);
      });
      this.models.set(key.name, { keyName: key.name, provider: key.provider, model });
    }
    const names = offered.map(({ name, provider }) => `${name} (${PROVIDER_NAMES[provider]})`);
    this.logger.log(`The AI's keys: ${names.length === 0 ? 'none' : names.join(', ')}`);
  }

  // The model of the key `llm.key` names now, read once: null when this server has no key by that name, which is only
  // `default` without OPENROUTER_API_KEY, since a saved name it does not have reads as `default` and the setting's
  // check refuses saving `default` then.
  chosen(): ChosenModel | null {
    return this.models.get(this.globalSettings.get(this.setting)) ?? null;
  }
}
