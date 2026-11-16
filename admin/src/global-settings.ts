/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// The global settings as the main server's /admin/settings routes answer them (main-server README: Global settings).

export type SettingValueType = 'STRING' | 'INTEGER' | 'BOOLEAN';

export type SettingValue = string | number | boolean;

// A global setting as the Settings page shows it. `value` is the one in effect on the server that answered; `allowed`
// is null when any value of the type is allowed, and each label is how the page names a value. `lastChange` is the
// latest save, with the minute it applies at.
export interface Setting {
  name: string;
  type: SettingValueType;
  description: string;
  default: SettingValue;
  value: SettingValue;
  allowed: { value: SettingValue; label: string }[] | null;
  lastChange: { newValue: string; appliesAt: string } | null;
}

// One save of a global setting, its values as text.
export interface SettingChange {
  name: string;
  oldValue: string;
  newValue: string;
  administratorEmail: string;
  changedAt: string;
  appliesAt: string;
}
