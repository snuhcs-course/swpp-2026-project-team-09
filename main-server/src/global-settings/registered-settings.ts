/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ConfigService } from '@nestjs/config';
import { type AiKeys, DEFAULT_KEY, PROVIDER_NAMES } from '../common/llm-keys.js';
import { type Settings } from '../common/settings.js';
import { defineSetting, type SettingCheck, type SettingDefinition, type SettingLabel } from './registry.js';

// Injected as the registry, so that a test can register a setting of its own.
export const SETTING_REGISTRY = Symbol('SETTING_REGISTRY');

// What llm.key is, with the type GlobalSettings.get answers by.
export interface LlmKeySetting {
  readonly name: 'llm.key';
  readonly type: 'STRING';
  readonly description: string;
  readonly default: string;
  readonly allowed: readonly string[];
  readonly check: SettingCheck;
  readonly label: SettingLabel;
}

// The name of the key the AI calls its model with, and with it the provider (spec A02). A chat answer and a Judgement
// read it once, at their start (src/assistant/model-port.ts). Its values are `default` and the name of each key the
// server offers; `default` is always among them, being the default, and its check refuses saving it without
// OPENROUTER_API_KEY.
export function llmKeySetting({ offered }: AiKeys): LlmKeySetting {
  const names = offered.map(({ name }) => name);
  // A key's name with its provider, such as "default (OpenRouter)"; never its value.
  const providers = new Map(offered.map(({ name, provider }) => [name, PROVIDER_NAMES[provider]]));
  return defineSetting({
    name: 'llm.key',
    type: 'STRING',
    description:
      "The AI's key, and with it the provider: default is OPENROUTER_API_KEY, the others come from LLM_KEYS.",
    default: DEFAULT_KEY,
    allowed: [DEFAULT_KEY, ...names.filter((name) => name !== DEFAULT_KEY)],
    check: (value) => (names.includes(String(value)) ? null : `The server has no key named ${String(value)}.`),
    label: (value) => {
      const provider = providers.get(String(value));
      return provider === undefined ? `${String(value)} (no key)` : `${String(value)} (${provider})`;
    },
  });
}

// What the Collections' switches are when no Administrator has saved a value: the env settings of the same name, so
// that a server, a test or an evaluation with no saved row behaves as before.
export interface SwitchDefaults {
  readonly AUTOMATIC_JUDGEMENT: boolean;
  readonly SAME_EVENT_TITLE_RULE: boolean;
  readonly SAME_EVENT_AI_CHOICE: boolean;
  readonly EXTRA_SNU_COLLECTION: boolean;
}

export function switchDefaultsOf(settings: ConfigService<Settings, true>): SwitchDefaults {
  return {
    AUTOMATIC_JUDGEMENT: settings.get('AUTOMATIC_JUDGEMENT', { infer: true }),
    SAME_EVENT_TITLE_RULE: settings.get('SAME_EVENT_TITLE_RULE', { infer: true }),
    SAME_EVENT_AI_CHOICE: settings.get('SAME_EVENT_AI_CHOICE', { infer: true }),
    EXTRA_SNU_COLLECTION: settings.get('EXTRA_SNU_COLLECTION', { infer: true }),
  };
}

// The step's switches, by name for GlobalSettings.get.
export interface StepSwitchSettings {
  readonly judgement: BooleanSetting;
  readonly titleRule: BooleanSetting;
  readonly aiChoice: BooleanSetting;
}

// What a switch is, with the type GlobalSettings.get answers by.
export interface BooleanSetting {
  readonly name: string;
  readonly type: 'BOOLEAN';
  readonly description: string;
  readonly default: boolean;
  readonly allowed: readonly boolean[];
  readonly check?: SettingCheck;
  readonly label: SettingLabel;
}

const onOff: SettingLabel = (value) => (value === true ? 'on' : 'off');

function switchSetting(name: string, description: string, byDefault: boolean, check?: SettingCheck): BooleanSetting {
  return defineSetting({
    name,
    type: 'BOOLEAN',
    description,
    default: byDefault,
    allowed: [true, false],
    ...(check === undefined ? {} : { check }),
    label: onOff,
  });
}

// The AI's switches are refused on with no key, as the env settings are at start.
function needsAKey({ offered }: AiKeys): SettingCheck {
  return (value) =>
    value === true && offered.length === 0
      ? 'The server has no AI key, neither OPENROUTER_API_KEY nor LLM_KEYS.'
      : null;
}

// The switches of the step after a Collection (README.md: Global Events). Each is read at the start of each run of the
// step, so a save applies from the first Collection after the next minute; infra/production/README.md says when each
// may be turned on.
export function stepSwitchSettings(defaults: SwitchDefaults, keys: AiKeys): StepSwitchSettings {
  return {
    judgement: switchSetting(
      'judgement.automatic',
      'Whether the AI judges the Drafts the rules left after a Collection, sending their posts to the model provider. With nothing saved, the env setting AUTOMATIC_JUDGEMENT.',
      defaults.AUTOMATIC_JUDGEMENT,
      needsAKey(keys),
    ),
    titleRule: switchSetting(
      'sameEvent.titleRule',
      'Whether a session is attached to an event of an equal title and start, so it shows once. With nothing saved, the env setting SAME_EVENT_TITLE_RULE.',
      defaults.SAME_EVENT_TITLE_RULE,
    ),
    aiChoice: switchSetting(
      'sameEvent.aiChoice',
      'Whether the AI chooses the same event among the candidates the rules leave, sending their posts to the model provider. With nothing saved, the env setting SAME_EVENT_AI_CHOICE.',
      defaults.SAME_EVENT_AI_CHOICE,
      needsAKey(keys),
    ),
  };
}

// Whether the worker's schedule starts extra.snu's Collections, which it asks the main server before each one
// (POST /collections/scheduled). A Collection already running goes on; `node dist/collect extra_snu` does not ask.
export function extraSnuCollectionSetting(defaults: SwitchDefaults): BooleanSetting {
  return switchSetting(
    'collection.extraSnu',
    "Whether the worker's schedule collects extra.snu's programmes, at 03:00 and 15:00. Keep it off while sameEvent.titleRule is: an event posted on both Sources would show twice. With nothing saved, the env setting EXTRA_SNU_COLLECTION.",
    defaults.EXTRA_SNU_COLLECTION,
  );
}

// Every global setting an Administrator may change on the admin site, from what the server holds at start: the
// GlobalSettingsModule's factory gives them. Add one with defineSetting() from registry.ts; README.md: Global settings.
export function registeredSettings(keys: AiKeys, defaults: SwitchDefaults): SettingDefinition[] {
  const { judgement, titleRule, aiChoice } = stepSwitchSettings(defaults, keys);
  return [llmKeySetting(keys), judgement, titleRule, aiChoice, extraSnuCollectionSetting(defaults)];
}
