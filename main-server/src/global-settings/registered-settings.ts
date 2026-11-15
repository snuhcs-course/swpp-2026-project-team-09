/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { aiKeysOf, DEFAULT_KEY } from '../common/llm-keys.js';
import { settingsSchema } from '../common/settings.js';
import { defineSetting, type SettingDefinition } from './registry.js';

// Injected as the registry, so that a test can register a setting of its own.
export const SETTING_REGISTRY = Symbol('SETTING_REGISTRY');

// The names of the AI's keys the server holds, read from the environment that ConfigModule checked when the server
// started: `default` and the name of each key in LLM_KEYS whose provider its value tells. `default` is always among
// them, being the default; saving it without OPENROUTER_API_KEY is refused by the model port's extra check.
function aiKeyNames(): string[] {
  const { shape } = settingsSchema;
  const { offered } = aiKeysOf({
    OPENROUTER_API_KEY: shape.OPENROUTER_API_KEY.parse(process.env.OPENROUTER_API_KEY),
    LLM_KEYS: shape.LLM_KEYS.parse(process.env.LLM_KEYS),
  });
  return [DEFAULT_KEY, ...offered.flatMap(({ name }) => (name === DEFAULT_KEY ? [] : [name]))];
}

// The name of the key the AI calls its model with, and with it the provider (spec A02). A chat answer and a Judgement
// read it once, at their start (src/assistant/model-port.ts).
export const LLM_KEY = defineSetting({
  name: 'llm.key',
  type: 'STRING',
  description: "The AI's key, and with it the provider: default is OPENROUTER_API_KEY, the others come from LLM_KEYS.",
  default: DEFAULT_KEY,
  allowed: aiKeyNames,
});

// Every global setting an Administrator may change on the admin site. Add one with defineSetting() from registry.ts;
// README.md: Global settings. A setting whose values are known only at start, such as the names of the keys the server
// holds, gives its definition a function, evaluated when the server starts.
export const REGISTERED_SETTINGS: readonly SettingDefinition[] = [LLM_KEY];
