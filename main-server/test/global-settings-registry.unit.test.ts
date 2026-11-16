/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import {
  appliesAt,
  defineSetting,
  parseValue,
  resolveRegistry,
  type ResolvedSetting,
  type SettingDefinition,
} from '../src/global-settings/registry.js';

// Test-only settings, one of each type. The registry has no product setting yet.
const COLOUR = defineSetting({
  name: 'test.colour',
  type: 'STRING',
  description: 'A colour.',
  default: 'red',
  allowed: ['red', 'blue'],
});
const LIMIT = defineSetting({ name: 'test.limit', type: 'INTEGER', description: 'A limit.', default: 3 });
const SWITCH = defineSetting({ name: 'test.switch', type: 'BOOLEAN', description: 'A switch.', default: false });

function resolved(name: string, definitions: readonly SettingDefinition[] = [COLOUR, LIMIT, SWITCH]): ResolvedSetting {
  const setting = resolveRegistry(definitions).get(name);
  if (setting === undefined) throw new Error(`${name} is not resolved`);
  return setting;
}

describe('a global setting value', () => {
  it('takes a value of the type among the allowed ones', () => {
    expect(parseValue(resolved('test.colour'), 'blue')).toEqual({ ok: true, value: 'blue' });
    expect(parseValue(resolved('test.limit'), '-12')).toEqual({ ok: true, value: -12 });
    expect(parseValue(resolved('test.switch'), 'true')).toEqual({ ok: true, value: true });
  });

  it('refuses a value that is not allowed', () => {
    expect(parseValue(resolved('test.colour'), 'green')).toEqual({
      ok: false,
      reason: 'test.colour: green is not one of red, blue.',
    });
  });

  it('refuses a value of the wrong type', () => {
    for (const text of ['3.5', '', 'three', '99999999999999999999']) {
      expect(parseValue(resolved('test.limit'), text).ok).toBe(false);
    }
    for (const text of ['TRUE', '1', 'yes']) {
      expect(parseValue(resolved('test.switch'), text).ok).toBe(false);
    }
  });
});

// As llm.key's check refuses a value it allows but the server cannot use now.
const check = (value: unknown): string | null => (value === 'beta' ? 'beta has no key.' : null);

describe('the global settings registry at start', () => {
  it('keeps a definition made at start from what the server holds, with its check', () => {
    const key = defineSetting({
      name: 'test.key',
      type: 'STRING',
      description: 'Which named key.',
      default: 'alpha',
      allowed: ['alpha', 'beta'],
      check,
    });
    const setting = resolved('test.key', [key]);

    expect(setting).toMatchObject({ default: 'alpha', allowed: ['alpha', 'beta'], check });
    expect(parseValue(setting, 'beta').ok).toBe(true);
    expect(parseValue(setting, 'gamma').ok).toBe(false);
  });

  it('refuses to start with a default that is not allowed', () => {
    const wrong = defineSetting({ ...COLOUR, default: 'green' });
    expect(() => resolveRegistry([wrong])).toThrow('The default of the setting test.colour is wrong');
  });

  it('refuses to start with two settings of one name', () => {
    expect(() => resolveRegistry([COLOUR, COLOUR])).toThrow('registered twice');
  });

  it('applies a save at the next minute at second 0', () => {
    expect(appliesAt(new Date('2026-11-15T05:00:20.500Z'))).toEqual(new Date('2026-11-15T05:01:00.000Z'));
    expect(appliesAt(new Date('2026-11-15T05:00:00.000Z'))).toEqual(new Date('2026-11-15T05:01:00.000Z'));
  });
});
