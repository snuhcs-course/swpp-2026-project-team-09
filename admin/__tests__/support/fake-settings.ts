/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Setting, SettingChange } from '@/global-settings';

import { refused } from './fake-global-events';

// The main server's global settings as the fake main server keeps them: llm.key with two keys, and its history. A
// save applies at the next minute, as on every pod.

function llmKey(): Setting {
  return {
    name: 'llm.key',
    type: 'STRING',
    description: "The AI's key, and with it the provider.",
    default: 'default',
    value: 'default',
    allowed: [
      { value: 'default', label: 'default (OpenRouter)' },
      { value: 'claude', label: 'claude (Anthropic)' },
    ],
    lastChange: null,
  };
}

function nextMinute(instant: number): string {
  return new Date(Math.floor(instant / 60_000) * 60_000 + 60_000).toISOString();
}

export class FakeSettings {
  private settings: Setting[] = [llmKey()];
  private changes: SettingChange[] = [];
  private keyless = new Set<string>();

  reset(): void {
    this.settings = [llmKey()];
    this.changes = [];
    this.keyless.clear();
  }

  // A change saved earlier, as another Administrator might have made it.
  hasChange(change: SettingChange): void {
    this.changes.unshift(change);
    this.settings = this.settings.map((setting) =>
      setting.name === change.name
        ? { ...setting, lastChange: { newValue: change.newValue, appliesAt: change.appliesAt } }
        : setting,
    );
  }

  list(): Setting[] {
    return this.settings;
  }

  history(): SettingChange[] {
    return this.changes;
  }

  save(name: string, value: string, administratorEmail: string): { appliesAt: string } {
    const setting = this.settings.find((each) => each.name === name);
    if (setting === undefined) {
      throw refused(400, { message: `${name} is not a setting.` });
    }
    const allowed = setting.allowed?.map((each) => String(each.value)) ?? null;
    if (allowed !== null && !allowed.includes(value)) {
      throw refused(400, { message: `${name}: ${value} is not one of ${allowed.join(', ')}.` });
    }
    if (name === 'llm.key' && this.keyless.has(value)) {
      throw refused(400, { message: `The server has no key named ${value}.` });
    }
    const now = Date.now();
    const appliesAt = nextMinute(now);
    this.hasChange({
      name,
      oldValue: this.changes.find((each) => each.name === name)?.newValue ?? String(setting.default),
      newValue: value,
      administratorEmail,
      changedAt: new Date(now).toISOString(),
      appliesAt,
    });
    return { appliesAt };
  }

  // As llm.key's check refuses a key name the server has no key for.
  hasNoKey(name: string): void {
    this.keyless.add(name);
  }
}
