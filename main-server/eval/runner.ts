/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { INestApplication } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { Server } from 'node:http';
import { type Model } from '../src/assistant/adapter.js';
import { type AssistantReplyDto } from '../src/assistant/dto/assistant-messages.dto.js';
import { sentProposalOf as sentBackProposal } from '../src/assistant/proposal.js';
import { CLOCK, type Clock } from '../src/quests/clock.js';
import { type Settings } from '../src/common/settings.js';
import { postAssistantMessages, type SentMessage } from '../test/assistant.js';
import { refuseMatchServer } from '../test/match-server.js';
import { startApp } from '../test/start-app.js';
import { refuseKakao } from '../test/walking-route.js';
import {
  type CaseKind,
  type CaseProposal,
  type CaseTurn,
  type EvalCase,
  kindOf,
  nowOf,
  WORLD_CLOCKS,
} from './cases.ts';
import { addTokens, costOf, NO_TOKENS, type Tokens } from './cost.ts';
import { type RunOptions, runName } from './options.ts';
import { Recorder } from './recorder.ts';
import { runObserverModule } from './run-observer.module.ts';
import { failureOf, type ReplyTrace, type TurnTrace, usageOf } from './trace.ts';
import { type Seeded, seedOf, type World } from './world.ts';

// The runner (spec P19, ticket 01): the app started as the e2e tests start it, with the model behind the recorder and
// the clock fixed, each case's turns sent to POST /assistant/messages as the app sends them, and the run saved as
// JSON with every turn's trace.

// The fixed time of a run of the small world: 2026-10-21 (수) 14:05 in Korea.
export const NOW = WORLD_CLOCKS.small;

// The daily message limit of a run, above any run's turns, so that the limit never answers in the model's place.
const RUN_DAILY_MESSAGES = '1000000';

export const RESULTS_DIRECTORY = new URL('results/', import.meta.url);

export interface EvalApp {
  app: INestApplication<Server>;
  recorder: Recorder;
  // Stands the app's clock at this time, until the next.
  setNow: (now: string) => void;
}

// Starts the app with `model` behind the recorder, the run's limits as its settings and the clock fixed at its world's.
// `settings` are the e2e settings with the model's key and id.
export async function startEvalApp(
  settings: Partial<Record<keyof Settings, string>>,
  model: Model,
  options: RunOptions,
): Promise<EvalApp> {
  const recorder = new Recorder({ temperature: options.temperature, topP: options.topP });
  const app = await startApp(
    {
      ...settings,
      ASSISTANT_MODEL: options.model,
      ASSISTANT_DAILY_MESSAGES: RUN_DAILY_MESSAGES,
      ASSISTANT_MAX_STEPS: String(options.maxSteps),
      ASSISTANT_TIMEOUT_MS: String(options.timeoutMs),
      ASSISTANT_MAX_OUTPUT_TOKENS: String(options.maxOutputTokens),
    },
    [],
    refuseKakao,
    refuseMatchServer,
    recorder.wrap(model),
    [runObserverModule(recorder)],
  );
  let now = WORLD_CLOCKS[options.world];
  vi.spyOn(app.get<Clock>(CLOCK), 'now').mockImplementation(() => new Date(now));
  return {
    app,
    recorder,
    setNow: (next) => {
      now = next;
    },
  };
}

type SentAssistant = Extract<SentMessage, { role: 'assistant' }>;

// A message of a case: a Restaurant card goes back by its key, which is no UUID.
type RequestMessage =
  | SentMessage
  | (Omit<SentAssistant, 'cards'> & { cards: { kind: 'quest' | 'globalEvent' | 'restaurant'; id: string }[] });

function sentProposalOf(proposal: CaseProposal, world: World): SentAssistant['proposal'] {
  const { place, globalEvent, invitees, ...values } = proposal;
  return {
    ...values,
    place: place === null ? null : { id: seedOf(world.seeds, 'place', place).id, name: place },
    globalEvent:
      globalEvent === null ? null : { id: seedOf(world.seeds, 'globalEvent', globalEvent).id, title: globalEvent },
    invitees: invitees.map((name) => ({ id: seedOf(world.seeds, 'friend', name).id, name })),
  };
}

// A case's turns as the app sends them, its seed names turned into the world's ids.
export function requestMessages(turns: readonly CaseTurn[], world: World): RequestMessage[] {
  return turns.map((turn): RequestMessage => {
    if ('user' in turn) {
      return { role: 'user', text: turn.user };
    }
    const { text, cards, proposal } = turn.assistant;
    return {
      role: 'assistant',
      text,
      cards: cards.map(({ kind, seed }) => ({ kind, id: seedOf(world.seeds, kind, seed).id })),
      proposal: proposal === null ? null : sentProposalOf(proposal, world),
    };
  });
}

// The reply sent back with the next message, as the app does: the cards by reference, the Proposal by its values.
function sentBack({ text, cards, proposal }: AssistantReplyDto): SentAssistant {
  return {
    role: 'assistant',
    text,
    cards: cards.map((card) =>
      card.kind === 'quest' ? { kind: card.kind, id: card.quest.id } : { kind: card.kind, id: card.globalEvent.id },
    ),
    proposal: proposal === null ? null : sentBackProposal(proposal),
  };
}

// The access token of the User who asks the case.
function accessTokenOf(world: World, { asker }: EvalCase): string {
  if (asker === undefined) {
    return world.accessToken;
  }
  const token = world.askers[asker];
  if (token === undefined) {
    throw new Error(`The world has no asker named ${asker}`);
  }
  return token;
}

// Sends the messages and records the turn.
async function sendTurn(
  evalApp: EvalApp,
  accessToken: string,
  messages: readonly RequestMessage[],
  options: RunOptions,
): Promise<{ trace: TurnTrace; body: AssistantReplyDto | null }> {
  const { app, recorder } = evalApp;
  recorder.begin();
  const started = performance.now();
  const response = await postAssistantMessages(app, accessToken, messages);
  const latencyMs = Math.round(performance.now() - started);
  const steps = recorder.take();
  const ok = response.status === 200;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- the endpoint's reply, which its e2e tests check
  const body = response.body as AssistantReplyDto;
  const reply: ReplyTrace | null = ok ? { ...body, textLength: body.text.length } : null;
  const last = messages.at(-1);
  const trace: TurnTrace = {
    user: last?.role === 'user' ? last.text : '',
    status: response.status,
    latencyMs,
    steps,
    reply,
    failure: failureOf(response.status, steps, latencyMs, options),
    errorBody: ok ? null : (response.body as unknown),
  };
  return { trace, body: ok ? body : null };
}

// One run of a case.
export interface CaseRun {
  id: string;
  category: string;
  kind: CaseKind;
  // 1 for the first run of a case, up to its repetitions.
  repetition: number;
  knownFailure: string | null;
  // As the case wrote them, for the scorer.
  expect: unknown;
  turnExpects: unknown[];
  turns: TurnTrace[];
}

export interface CaseRunControls {
  // Whether to go on after a live case's turn; the scorer (ticket 02) answers whether the turn passed.
  passed?: (turn: TurnTrace, expect: unknown) => boolean;
  // Told of each turn as it ends, such as to count its tokens toward the budget.
  turnEnded?: (turn: TurnTrace) => void;
  // Whether to stop before the next turn, such as when the budget is spent.
  stop?: () => boolean;
}

// Adds the reply to the conversation as the app does, which sends only the last Proposal back.
function sendBack(messages: SentMessage[], reply: AssistantReplyDto): void {
  if (reply.proposal !== null) {
    for (const message of messages) {
      if (message.role === 'assistant') {
        message.proposal = null;
      }
    }
  }
  messages.push(sentBack(reply));
}

// Runs a case: its one message, or a live case's messages one by one, each with the replies before it, stopping at a
// turn that failed.
export async function runCase(
  evalApp: EvalApp,
  world: World,
  evalCase: EvalCase,
  repetition: number,
  options: RunOptions,
  { passed = (): boolean => true, turnEnded = (): void => {}, stop = (): boolean => false }: CaseRunControls = {},
): Promise<CaseRun> {
  const kind = kindOf(evalCase);
  const accessToken = accessTokenOf(world, evalCase);
  evalApp.setNow(nowOf(evalCase));
  const userTurns = evalCase.turns.flatMap((turn) => ('user' in turn ? [turn] : []));
  const run: CaseRun = {
    id: evalCase.id,
    category: evalCase.category,
    kind,
    repetition,
    knownFailure: evalCase.knownFailure ?? evalCase.expect?.knownFailure ?? null,
    expect: evalCase.expect ?? null,
    turnExpects: userTurns.map(({ expect }) => expect ?? null),
    turns: [],
  };
  if (kind !== 'live') {
    const { trace } = await sendTurn(evalApp, accessToken, requestMessages(evalCase.turns, world), options);
    run.turns.push(trace);
    turnEnded(trace);
    return run;
  }
  const messages: SentMessage[] = [];
  for (const turn of userTurns) {
    if (run.turns.length > 0 && stop()) {
      break;
    }
    messages.push({ role: 'user', text: turn.user });
    // oxlint-disable-next-line no-await-in-loop -- each turn is sent with the replies before it
    const { trace, body } = await sendTurn(evalApp, accessToken, messages, options);
    run.turns.push(trace);
    turnEnded(trace);
    if (body === null || !passed(trace, turn.expect ?? null)) {
      break;
    }
    sendBack(messages, body);
  }
  return run;
}

// A run: its options, every case run so far and the tokens they took.
export class RunLog {
  readonly cases: CaseRun[] = [];
  private tokens: Tokens = NO_TOKENS;
  private stoppedBy: 'budget' | null = null;
  // The world's seeds by name, which the scorer reads a run's ids by.
  private seeds: Record<string, Seeded> = {};
  private readonly startedAt = new Date();

  constructor(private readonly options: RunOptions) {}

  // Counts a turn's tokens as soon as it ends, so that the budget stops a live case between its turns.
  countTurn(turn: TurnTrace): void {
    this.tokens = addTokens(this.tokens, usageOf(turn.steps));
  }

  // Keeps the world's seeds with the run, once the world is seeded.
  keepSeeds(seeds: Record<string, Seeded>): void {
    this.seeds = seeds;
  }

  // Keeps a case run, whose turns were counted as they ended.
  add(caseRun: CaseRun): void {
    this.cases.push(caseRun);
  }

  costUsd(): number {
    return costOf(this.tokens, this.options.prices);
  }

  // Whether the run has spent its budget, which stops it.
  overBudget(): boolean {
    if (this.costUsd() > this.options.budgetUsd) {
      this.stoppedBy = 'budget';
    }
    return this.stoppedBy !== null;
  }

  toJSON(): object {
    return {
      name: runName(this.options, this.startedAt),
      startedAt: this.startedAt.toISOString(),
      endedAt: new Date().toISOString(),
      now: WORLD_CLOCKS[this.options.world],
      options: this.options,
      stoppedBy: this.stoppedBy,
      seeds: this.seeds,
      totals: {
        cases: this.cases.length,
        turns: this.cases.reduce((total, { turns }) => total + turns.length, 0),
        tokens: this.tokens,
        costUsd: this.costUsd(),
      },
      cases: this.cases,
    };
  }

  // Saves the run under `directory`, a number added to its name when the name is taken, and answers the file.
  save(directory: URL = RESULTS_DIRECTORY): URL {
    mkdirSync(directory, { recursive: true });
    const name = runName(this.options, this.startedAt);
    let file = new URL(`${name}.json`, directory);
    for (let count = 2; existsSync(file); count += 1) {
      file = new URL(`${name}-${count}.json`, directory);
    }
    writeFileSync(file, `${JSON.stringify(this, null, 2)}\n`);
    return file;
  }
}
