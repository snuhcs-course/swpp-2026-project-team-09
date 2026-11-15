/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// The global settings' registry: what a setting is in code, and the checks of a value against it. Pure, so that it is
// tested without a database.

export type SettingValueType = 'STRING' | 'INTEGER' | 'BOOLEAN';

interface ValueOfType {
  STRING: string;
  INTEGER: number;
  BOOLEAN: boolean;
}

export type SettingValue = ValueOfType[SettingValueType];

export type SettingCheck = (value: SettingValue) => string | null;

export type SettingLabel = (value: SettingValue) => string;

// One global setting, as it is registered. `allowed`, when given, lists every value it may take; without it any value
// of its type is allowed. What is known only at start, such as the names of the keys the server holds, reaches the
// definition through the registry's factory (registered-settings.ts).
export type SettingDefinition = {
  [Type in SettingValueType]: {
    readonly name: string;
    readonly type: Type;
    // What the Settings page says the setting does.
    readonly description: string;
    readonly default: ValueOfType[Type];
    readonly allowed?: readonly ValueOfType[Type][];
    // A check of a save beyond the type and the allowed values: the reason it is refused, or null. Only a save runs it.
    readonly check?: SettingCheck;
    // How the Settings page names a value, as llm.key names a key with its provider. Without it, the value itself.
    readonly label?: SettingLabel;
  };
}[SettingValueType];

export type ValueOf<Definition extends SettingDefinition> = ValueOfType[Definition['type']];

// A definition as the server holds it after it started, `allowed` null when any value of the type is.
export interface ResolvedSetting {
  readonly name: string;
  readonly type: SettingValueType;
  readonly description: string;
  readonly default: SettingValue;
  // Null when any value of the type is allowed.
  readonly allowed: readonly SettingValue[] | null;
  readonly check: SettingCheck | null;
  readonly label: SettingLabel;
}

// Keeps the type of a definition's values, so that `GlobalSettings.get` answers it.
export function defineSetting<const Definition extends SettingDefinition>(definition: Definition): Definition {
  return definition;
}

// Resolves every definition. Throws when two share a name or a default is not among the
// allowed values, so that a server with a wrong registry does not start.
export function resolveRegistry(definitions: readonly SettingDefinition[]): Map<string, ResolvedSetting> {
  const resolved = new Map<string, ResolvedSetting>();
  for (const definition of definitions) {
    if (resolved.has(definition.name)) {
      throw new Error(`The setting ${definition.name} is registered twice.`);
    }
    const setting: ResolvedSetting = {
      name: definition.name,
      type: definition.type,
      description: definition.description,
      default: definition.default,
      allowed: definition.allowed ?? null,
      check: definition.check ?? null,
      label: definition.label ?? String,
    };
    const refusal = refusalOf(setting, setting.default);
    if (refusal !== null) {
      throw new Error(`The default of the setting ${definition.name} is wrong: ${refusal}`);
    }
    resolved.set(setting.name, setting);
  }
  return resolved;
}

function refusalOf(setting: ResolvedSetting, value: SettingValue): string | null {
  if (setting.allowed !== null && !setting.allowed.includes(value)) {
    return `${String(value)} is not one of ${setting.allowed.map(String).join(', ')}.`;
  }
  return null;
}

export type Parsed = { ok: true; value: SettingValue } | { ok: false; reason: string };

// A value as text, as a row keeps it and the Settings page sends it, checked against the setting's type and allowed
// values.
export function parseValue(setting: ResolvedSetting, text: string): Parsed {
  let value: SettingValue;
  switch (setting.type) {
    case 'STRING':
      value = text;
      break;
    case 'INTEGER':
      if (!/^-?\d+$/u.test(text) || !Number.isSafeInteger(Number(text))) {
        return { ok: false, reason: `${setting.name} takes a whole number, not "${text}".` };
      }
      value = Number(text);
      break;
    case 'BOOLEAN':
      if (text !== 'true' && text !== 'false') {
        return { ok: false, reason: `${setting.name} takes true or false, not "${text}".` };
      }
      value = text === 'true';
      break;
  }
  const refusal = refusalOf(setting, value);
  return refusal === null ? { ok: true, value } : { ok: false, reason: `${setting.name}: ${refusal}` };
}

// Every pod checks the revision at second 0 of each minute, so a save applies at the next one.
export function appliesAt(savedAt: Date): Date {
  const minute = new Date(savedAt);
  minute.setUTCSeconds(0, 0);
  return new Date(minute.getTime() + 60_000);
}
