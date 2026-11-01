/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { z } from 'zod';
import { causeOf, type Model } from '../../src/assistant/adapter.js';
import { judgementAnswerSchema } from '../../src/global-events/judgement-answer.js';
import { askForJudgement, type JudgementLimits } from '../../src/global-events/judgement-model.js';
import { maskedPost } from '../../src/global-events/judgement-post.js';
import {
  chooseSameEvent,
  type SameEventQuestion,
  type SessionChoice,
} from '../../src/global-events/same-event-choice.js';
import { SameEventOutcome } from '../../src/generated/prisma/client.js';
import { addTokens, costOf, NO_TOKENS, type Prices, type Tokens } from '../cost.ts';
import { Recorder } from '../recorder.ts';
import { BudgetSpentError } from './budget-spent-error.ts';
import { type ReadPost } from './read-post.ts';

// The calls of a run: asked once each, saved with the run, and read back instead of asked when a saved run gives them, so
// that a later run changes one thing, or scores again with no model at all (metrics document, 4.4).

export const storedJudgementSchema = z.strictObject({
  answer: judgementAnswerSchema.nullable(),
  failure: z.string().nullable(),
  modelId: z.string().nullable(),
});

export type StoredJudgement = z.infer<typeof storedJudgementSchema>;

export const storedChoicesSchema = z.strictObject({
  choices: z.array(
    z.strictObject({
      startsAt: z.coerce.date(),
      outcome: z.enum(SameEventOutcome),
      globalEventId: z.string().nullable(),
      reason: z.string().nullable(),
      failure: z.string().nullable(),
    }),
  ),
  modelId: z.string().nullable(),
});

export type StoredChoices = z.infer<typeof storedChoicesSchema>;

export interface SavedCalls {
  judgements: Record<string, StoredJudgement>;
  choices: Record<string, StoredChoices>;
}

export interface CallSettings {
  // None when the run may not call: what it needs must be saved.
  model: Model | null;
  // Evaluation B's AI run may ask for its choices only: a reading it lacks must not change under it.
  asksForJudgements: boolean;
  limits: JudgementLimits;
  prices: Prices;
  budgetUsd: number;
}

function savedCopy<Value>(saved: Record<string, Value>): Map<string, Value> {
  return new Map(Object.entries(saved));
}

export class ModelCalls {
  private readonly recorder = new Recorder({ temperature: null, topP: null });
  private readonly model: Model | null;
  private readonly judgements: Map<string, StoredJudgement>;
  private readonly choices: Map<string, StoredChoices>;
  private spent: Tokens = NO_TOKENS;
  private calls = 0;

  constructor(
    private readonly settings: CallSettings,
    saved: SavedCalls,
  ) {
    this.model = settings.model === null ? null : this.recorder.wrap(settings.model);
    this.judgements = savedCopy(saved.judgements);
    this.choices = savedCopy(saved.choices);
  }

  async judgement(post: ReadPost): Promise<StoredJudgement> {
    const saved = this.judgements.get(post.post);
    if (saved !== undefined) {
      return saved;
    }
    if (!this.settings.asksForJudgements) {
      throw new Error(`This run may not ask for a Judgement, and no saved run gives the one of ${post.post}`);
    }
    const model = this.available(post.post);
    const stored = await this.counted(async () => {
      try {
        const masked = maskedPost({ title: post.title, text: post.description });
        const call = await askForJudgement(model, masked, post.source, post.now, this.settings.limits);
        return { answer: call.answer, failure: null, modelId: call.modelId };
      } catch (error) {
        return { answer: null, failure: causeOf(error), modelId: null };
      }
    });
    this.judgements.set(post.post, stored);
    return stored;
  }

  async sameEvent(post: string, question: SameEventQuestion): Promise<SessionChoice[]> {
    const saved = this.choices.get(post);
    if (saved !== undefined) {
      return saved.choices;
    }
    const model = this.available(post);
    const stored = await this.counted(() => chooseSameEvent(model, question, this.settings.limits));
    this.choices.set(post, stored);
    return stored.choices;
  }

  saved(): SavedCalls {
    return { judgements: Object.fromEntries(this.judgements), choices: Object.fromEntries(this.choices) };
  }

  usage(): { calls: number; tokens: Tokens; costUsd: number } {
    return { calls: this.calls, tokens: this.spent, costUsd: costOf(this.spent, this.settings.prices) };
  }

  private available(post: string): Model {
    if (this.model === null) {
      throw new Error(`The run may not call the model, and no saved run gives the answer about ${post}`);
    }
    if (this.usage().costUsd > this.settings.budgetUsd) {
      throw new BudgetSpentError(this.settings.budgetUsd);
    }
    return this.model;
  }

  private async counted<Result>(call: () => Promise<Result>): Promise<Result> {
    this.recorder.begin();
    const result = await call();
    this.calls += 1;
    for (const { usage } of this.recorder.take()) {
      this.spent = addTokens(this.spent, usage ?? {});
    }
    return result;
  }
}

// Whether a failure is a malformed answer, a schema's refusal, rather than an answer that never came.
export function isMalformedAnswer(failure: string): boolean {
  return /NoObjectGenerated|TypeValidation|JSONParse|NoOutputGenerated/u.test(failure);
}
