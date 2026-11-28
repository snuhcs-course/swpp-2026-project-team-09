/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { aiKeysOf } from '../src/common/llm-keys.js';
import {
  extraSnuCollectionSetting,
  registeredSettings,
  stepSwitchSettings,
  type SwitchDefaults,
} from '../src/global-settings/registered-settings.js';
import { parseValue, resolveRegistry } from '../src/global-settings/registry.js';

const ALL_OFF: SwitchDefaults = {
  AUTOMATIC_JUDGEMENT: false,
  SAME_EVENT_TITLE_RULE: false,
  SAME_EVENT_AI_CHOICE: false,
  EXTRA_SNU_COLLECTION: false,
};
const WITH_KEY = aiKeysOf({ OPENROUTER_API_KEY: 'sk-or-test-key', LLM_KEYS: {} });
const WITHOUT_KEY = aiKeysOf({ OPENROUTER_API_KEY: '', LLM_KEYS: {} });

describe('The step switches as global settings', () => {
  it('are registered after llm.key, each a switch of on and off', () => {
    const registry = resolveRegistry(registeredSettings(WITH_KEY, ALL_OFF));

    expect([...registry.keys()]).toEqual([
      'llm.key',
      'judgement.automatic',
      'sameEvent.titleRule',
      'sameEvent.aiChoice',
      'collection.extraSnu',
    ]);
    const titleRule = registry.get('sameEvent.titleRule');
    expect(titleRule).toMatchObject({ type: 'BOOLEAN', allowed: [true, false] });
    expect([true, false].map((value) => titleRule?.label(value))).toEqual(['on', 'off']);
  });

  it('take their defaults from the env settings of the same name', () => {
    const settings = stepSwitchSettings(
      { ...ALL_OFF, AUTOMATIC_JUDGEMENT: true, SAME_EVENT_AI_CHOICE: true },
      WITH_KEY,
    );

    expect([settings.judgement, settings.titleRule, settings.aiChoice].map(({ default: value }) => value)).toEqual([
      true,
      false,
      true,
    ]);
  });
});

describe("extra.snu's Collections switch", () => {
  it('takes its default from EXTRA_SNU_COLLECTION, and on or off with no key', () => {
    const setting = extraSnuCollectionSetting({ ...ALL_OFF, EXTRA_SNU_COLLECTION: true });

    expect(setting).toMatchObject({ name: 'collection.extraSnu', default: true, allowed: [true, false] });
    expect(setting.check).toBeUndefined();
  });
});

describe('The AI step switches', () => {
  it('refuse being turned on when the server holds no key, and take off', () => {
    const { judgement, titleRule, aiChoice } = stepSwitchSettings(ALL_OFF, WITHOUT_KEY);

    for (const aiSwitch of [judgement, aiChoice]) {
      expect(aiSwitch.check?.(true)).toBe('The server has no AI key, neither OPENROUTER_API_KEY nor LLM_KEYS.');
      expect(aiSwitch.check?.(false)).toBeNull();
    }
    expect(titleRule.check).toBeUndefined();
  });

  it('take on when the server holds a key', () => {
    const { judgement, aiChoice } = stepSwitchSettings(ALL_OFF, WITH_KEY);

    expect([judgement.check?.(true), aiChoice.check?.(true)]).toEqual([null, null]);
  });

  it('parse true and false as the Settings page sends them, and nothing else', () => {
    const registry = resolveRegistry(registeredSettings(WITH_KEY, ALL_OFF));
    const judgement = registry.get('judgement.automatic');
    if (judgement === undefined) throw new Error('judgement.automatic is not registered');

    expect(parseValue(judgement, 'true')).toEqual({ ok: true, value: true });
    expect(parseValue(judgement, 'on')).toMatchObject({ ok: false });
  });
});
