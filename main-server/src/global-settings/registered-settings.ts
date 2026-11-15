/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type SettingDefinition } from './registry.js';

// Injected as the registry, so that a test can register a setting of its own.
export const SETTING_REGISTRY = Symbol('SETTING_REGISTRY');

// Every global setting an Administrator may change on the admin site. Add one with defineSetting() from registry.ts;
// README.md: Global settings. A module that knows a setting's values only at start, such as the key names the
// server holds, provides SETTING_REGISTRY with a factory instead and gives the definition a function.
export const REGISTERED_SETTINGS: readonly SettingDefinition[] = [];
