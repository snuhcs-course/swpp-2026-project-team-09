/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// The AI's keys (spec A02, "Keys"): OPENROUTER_API_KEY, the key named `default`, and every key of LLM_KEYS by its
// name. Pure, so that settings.ts, the registry and the model port read them alike. Nothing here logs a key's value.

export const LLM_PROVIDERS = ['anthropic', 'openrouter'] as const;
export type LlmProvider = (typeof LLM_PROVIDERS)[number];

// What each provider names Claude Haiku 5.5 by. A constant: only the key, and with it the provider, is chosen.
export const MODEL_IDS: Readonly<Record<LlmProvider, string>> = {
  anthropic: 'claude-haiku-5-5',
  openrouter: 'anthropic/claude-haiku-5.5',
};

// How the logs name each provider.
export const PROVIDER_NAMES: Readonly<Record<LlmProvider, string>> = {
  anthropic: 'Anthropic',
  openrouter: 'OpenRouter',
};

// The name `llm.key` gives OPENROUTER_API_KEY.
export const DEFAULT_KEY = 'default';

// The provider a key belongs to, told by its value: sk-ant- is Anthropic's and sk-or- OpenRouter's. Null for any other.
export function providerOfKey(value: string): LlmProvider | null {
  if (value.startsWith('sk-ant-')) {
    return 'anthropic';
  }
  return value.startsWith('sk-or-') ? 'openrouter' : null;
}

export interface AiKey {
  readonly name: string;
  readonly provider: LlmProvider;
  readonly apiKey: string;
}

export interface AiKeys {
  // The keys the AI may call its model with, `default` first when OPENROUTER_API_KEY is set.
  readonly offered: readonly AiKey[];
  // The names of the keys whose provider their value does not tell, which are not offered.
  readonly unknown: readonly string[];
}

export function aiKeysOf({
  OPENROUTER_API_KEY,
  LLM_KEYS,
}: {
  OPENROUTER_API_KEY: string;
  LLM_KEYS: Readonly<Record<string, string>>;
}): AiKeys {
  const named = [
    ...(OPENROUTER_API_KEY === '' ? [] : [[DEFAULT_KEY, OPENROUTER_API_KEY]]),
    ...Object.entries(LLM_KEYS),
  ];
  const offered: AiKey[] = [];
  const unknown: string[] = [];
  for (const [name, apiKey] of named) {
    const provider = providerOfKey(apiKey);
    if (provider === null) {
      unknown.push(name);
    } else {
      offered.push({ name, provider, apiKey });
    }
  }
  return { offered, unknown };
}
