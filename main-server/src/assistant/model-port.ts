/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type FactoryProvider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { type ModelCache, MODEL_SETTINGS, type ModelProvider, type Settings } from '../common/settings.js';
import { anthropicModel, type Model, MODEL_PORT, openRouterModel } from './adapter.js';

// The model port's binding, the one both AssistantModule and GlobalEventsModule use: the model through the provider
// MODEL_PROVIDER names, with that provider's key and model id (spec A01, "The provider setting").

export type ModelSettings = Pick<
  Settings,
  'MODEL_PROVIDER' | 'ANTHROPIC_API_KEY' | 'ANTHROPIC_MODEL' | 'OPENROUTER_API_KEY' | 'ASSISTANT_MODEL' | 'MODEL_CACHE'
>;

// The model through `provider`, with its key and its id. The cache mode is the Anthropic path's only; OpenRouter's
// requests cache nothing. Only the benchmark and the tests pass a fetch of their own.
export function modelThrough(
  provider: ModelProvider,
  apiKey: string,
  modelId: string,
  cache: ModelCache,
  fetch?: typeof globalThis.fetch,
): Model {
  return provider === 'anthropic'
    ? anthropicModel(apiKey, modelId, cache, fetch)
    : openRouterModel(apiKey, modelId, fetch);
}

export function modelOf(settings: ModelSettings, fetch?: typeof globalThis.fetch): Model {
  const { key, model } = MODEL_SETTINGS[settings.MODEL_PROVIDER];
  return modelThrough(settings.MODEL_PROVIDER, settings[key], settings[model], settings.MODEL_CACHE, fetch);
}

// Whether the chosen provider has a key, which the Assistant and the Judgement ask before they call the model.
export function keyConfigured(settings: ConfigService<Settings, true>): boolean {
  const provider: ModelProvider = settings.get('MODEL_PROVIDER', { infer: true });
  return settings.get(MODEL_SETTINGS[provider].key, { infer: true }) !== '';
}

export const MODEL_PORT_PROVIDER: FactoryProvider<Model> = {
  provide: MODEL_PORT,
  inject: [ConfigService],
  useFactory: (settings: ConfigService<Settings, true>): Model =>
    modelOf({
      MODEL_PROVIDER: settings.get('MODEL_PROVIDER', { infer: true }),
      ANTHROPIC_API_KEY: settings.get('ANTHROPIC_API_KEY', { infer: true }),
      ANTHROPIC_MODEL: settings.get('ANTHROPIC_MODEL', { infer: true }),
      OPENROUTER_API_KEY: settings.get('OPENROUTER_API_KEY', { infer: true }),
      ASSISTANT_MODEL: settings.get('ASSISTANT_MODEL', { infer: true }),
      MODEL_CACHE: settings.get('MODEL_CACHE', { infer: true }),
    }),
};
