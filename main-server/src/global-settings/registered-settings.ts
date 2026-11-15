/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type AiKeys, DEFAULT_KEY } from '../common/llm-keys.js';
import { defineSetting, type SettingCheck, type SettingDefinition } from './registry.js';

// Injected as the registry, so that a test can register a setting of its own.
export const SETTING_REGISTRY = Symbol('SETTING_REGISTRY');

// The name of the key the AI calls its model with, and with it the provider (spec A02). A chat answer and a Judgement
// read it once, at their start (src/assistant/model-port.ts). Its values are `default` and the name of each key the
// server offers; `default` is always among them, being the default, and its check refuses saving it without
// OPENROUTER_API_KEY.
// What llm.key is, with the type GlobalSettings.get answers by.
export interface LlmKeySetting {
  readonly name: 'llm.key';
  readonly type: 'STRING';
  readonly description: string;
  readonly default: string;
  readonly allowed: readonly string[];
  readonly check: SettingCheck;
}

export function llmKeySetting({ offered }: AiKeys): LlmKeySetting {
  const names = offered.map(({ name }) => name);
  return defineSetting({
    name: 'llm.key',
    type: 'STRING',
    description:
      "The AI's key, and with it the provider: default is OPENROUTER_API_KEY, the others come from LLM_KEYS.",
    default: DEFAULT_KEY,
    allowed: [DEFAULT_KEY, ...names.filter((name) => name !== DEFAULT_KEY)],
    check: (value) => (names.includes(String(value)) ? null : `The server has no key named ${String(value)}.`),
  });
}

// Every global setting an Administrator may change on the admin site, from what the server holds at start: the
// GlobalSettingsModule's factory gives them. Add one with defineSetting() from registry.ts; README.md: Global settings.
export function registeredSettings(keys: AiKeys): SettingDefinition[] {
  return [llmKeySetting(keys)];
}
