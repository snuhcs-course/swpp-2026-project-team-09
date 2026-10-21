/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// The trace of a turn (spec P19, "The recorder"): what the model did in it, step by step, and how the turn ended. A
// saved run holds one per turn, and the scorer (ticket 02) reads them without calling the model again.

// The tokens of a model call, or of a sum of them. A provider that does not report one leaves it null.
export interface Usage {
  inputTokens: number | null;
  outputTokens: number | null;
  cacheReadTokens: number | null;
  cacheWriteTokens: number | null;
}

// A tool the model called: its input as the model wrote it, and what the tool returned or threw, as the run observer
// reported it. Neither is there when the run ended before the tool did.
export interface ToolCallTrace {
  id: string;
  name: string;
  input: unknown;
  result?: unknown;
  error?: string;
}

// One step: one model call, the tools it called and what it wrote, its finish reason and its usage. A call that
// failed, such as one aborted when the time ran out, has the error's name and no finish reason.
export interface StepTrace {
  toolCalls: ToolCallTrace[];
  text: string;
  finishReason: string | null;
  usage: Usage | null;
  latencyMs: number;
  // Whether the run told the observer the step ended, which it does once the step's tools returned.
  ended: boolean;
  error?: string;
}

// Why the Assistant did not answer. STEP_LIMIT: the last step at the step cap ended on tool calls. TIMEOUT: the time
// per message ran out. ERROR: anything else, such as the provider failing or a refused request.
export type FailureKind = 'STEP_LIMIT' | 'TIMEOUT' | 'ERROR';

// The reply as the endpoint sent it, and the length of its text.
export interface ReplyTrace {
  text: string;
  textLength: number;
  mapButtons: string[];
  cards: { kind: string }[];
  proposal: unknown;
}

export interface TurnTrace {
  // The User's message of the turn.
  user: string;
  status: number;
  latencyMs: number;
  steps: StepTrace[];
  reply: ReplyTrace | null;
  failure: FailureKind | null;
  // The body of a reply that was not 200.
  errorBody: unknown;
}

// The limits a turn ran under.
export interface TurnLimits {
  maxSteps: number;
  timeoutMs: number;
}

const TIME_ERRORS = new Set(['TimeoutError', 'AbortError']);

// Why a turn failed, read from its status and its steps, since the endpoint answers every failure with one 503. The
// step cap is STEP_LIMIT only once its last step ended, its tools having returned.
export function failureOf(
  status: number,
  steps: readonly StepTrace[],
  latencyMs: number,
  limits: TurnLimits,
): FailureKind | null {
  if (status === 200) {
    return null;
  }
  if (status !== 503) {
    return 'ERROR';
  }
  const last = steps.at(-1);
  if (steps.length >= limits.maxSteps && last?.ended === true && last.finishReason === 'tool-calls') {
    return 'STEP_LIMIT';
  }
  const timedOut = steps.some(({ error }) => error !== undefined && TIME_ERRORS.has(error));
  return timedOut || latencyMs >= limits.timeoutMs ? 'TIMEOUT' : 'ERROR';
}

function sum(values: (number | null)[]): number | null {
  return values.every((value) => value === null)
    ? null
    : values.reduce<number>((total, value) => total + (value ?? 0), 0);
}

// The usage of the steps together.
export function usageOf(steps: readonly StepTrace[]): Usage {
  const usages = steps.map(({ usage }) => usage);
  return {
    inputTokens: sum(usages.map((usage) => usage?.inputTokens ?? null)),
    outputTokens: sum(usages.map((usage) => usage?.outputTokens ?? null)),
    cacheReadTokens: sum(usages.map((usage) => usage?.cacheReadTokens ?? null)),
    cacheWriteTokens: sum(usages.map((usage) => usage?.cacheWriteTokens ?? null)),
  };
}
