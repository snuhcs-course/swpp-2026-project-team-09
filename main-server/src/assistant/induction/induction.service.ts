/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma.service.js';
import { type Settings } from '../../common/settings.js';
import { type PrismaClient } from '../../generated/prisma/client.js';
import { toPlaceDto } from '../../places/dto/place.dto.js';
import { PlaceMatcher } from '../../places/place-matcher.js';
import { type Standing } from './gate.js';
import { induce, type InductionResult } from './induction.js';
import { INSTANCE_WINDOW_DAYS, type LabelRow } from './instances.js';
import { REFLECTOR, type Reflector } from './reflector.js';

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RuleReport {
  kind: 'name' | 'words';
  pattern: string;
  replace: string;
  example: string | null;
  fixed: number;
  broke: number;
  accounts: number;
  heldOutGain: number;
}

// What one run did, for the logs and for whoever started it with `wait`.
export interface InductionReport {
  ranAt: string;
  model: string;
  seed: number;
  instances: { train: number; heldOut: number };
  // The reflector calls made, and the rules they proposed.
  calls: number;
  proposals: number;
  promoted: RuleReport[];
  refused: RuleReport[];
  retired: RuleReport[];
  // The rules in force after the run.
  active: number;
}

// The three columns that tell one rule from another.
function textOf({ kind, pattern, replace }: Standing['rule']): {
  kind: 'name' | 'words';
  pattern: string;
  replace: string;
} {
  return { kind, pattern, replace };
}

export function reportOf({ rule, ...standing }: Standing): RuleReport {
  return { kind: rule.kind, pattern: rule.pattern, replace: rule.replace, ...standing };
}

// The Place rows of the window before `before`, with each account's onboarding.
export async function labelRows(prisma: Pick<PrismaClient, 'resolutionEvent'>, before: Date): Promise<LabelRow[]> {
  const rows = await prisma.resolutionEvent.findMany({
    where: {
      kind: 'place',
      createdAt: { gte: new Date(before.getTime() - INSTANCE_WINDOW_DAYS * DAY_MS), lt: before },
    },
    select: {
      id: true,
      userId: true,
      words: true,
      outcome: true,
      chosenId: true,
      createdAt: true,
      user: { select: { onboardedAt: true } },
    },
  });
  return rows.map((row) => ({
    id: row.id,
    userId: row.userId,
    onboardedAt: row.user.onboardedAt,
    words: row.words,
    outcome: row.outcome,
    chosenId: row.chosenId,
    createdAt: row.createdAt,
  }));
}

// One induction on this server's database (P07 ticket 07): the rows of the window, the loop, the gate, the audit, the
// table written in one transaction, and the matcher's indexes built again. Started by the worker's schedule through
// POST /assistant/induction.
@Injectable()
export class InductionService {
  private readonly logger = new Logger(InductionService.name);
  private running: Promise<InductionReport> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly matcher: PlaceMatcher,
    @Inject(REFLECTOR) private readonly reflector: Reflector,
    private readonly settings: ConfigService<Settings, true>,
  ) {}

  // A run now. A second call while one runs on this server joins it.
  run(): Promise<InductionReport> {
    this.running ??= this.runOnce().finally(() => {
      this.running = null;
    });
    return this.running;
  }

  private async runOnce(): Promise<InductionReport> {
    const now = new Date();
    const seed = now.getTime() % 2_147_483_647;
    const places = (await this.prisma.place.findMany()).map((place) => toPlaceDto(place));
    const result = await induce({
      places,
      rows: await labelRows(this.prisma, now),
      active: this.matcher.activeRules(),
      reflector: this.reflector,
      budget: this.settings.get('ASSISTANT_INDUCTION_BUDGET', { infer: true }),
      seed,
    });
    await this.write(result, now);
    await this.matcher.reload();
    const report: InductionReport = {
      ranAt: now.toISOString(),
      model: this.reflector.modelId,
      seed,
      instances: result.instances,
      calls: result.evolution.attempts.length,
      proposals: result.evolution.attempts.reduce((sum, { proposals }) => sum + proposals.length, 0),
      promoted: result.promoted.map((standing) => reportOf(standing)),
      refused: result.refused.map((standing) => reportOf(standing)),
      retired: result.retired.map((standing) => reportOf(standing)),
      active: result.kept.length,
    };
    this.logger.log(
      `Induction: ${report.calls} calls, ${report.promoted.length} rules promoted, ${report.retired.length} retired, ` +
        `${report.active} in force`,
    );
    return report;
  }

  // The promoted rules made or brought back, every rule in force counted again, the retired ones marked, in order.
  private async write({ promoted, kept, retired }: InductionResult, now: Date): Promise<void> {
    const model = this.reflector.modelId;
    await this.prisma.$transaction([
      ...promoted.map(({ rule, fixed, broke, accounts, example }) =>
        this.prisma.inducedRule.upsert({
          where: { kind_pattern_replace: textOf(rule) },
          create: { id: rule.id, ...textOf(rule), example: example ?? '', fixed, broke, accounts, model },
          update: { retiredAt: null, example: example ?? '', fixed, broke, accounts, model },
        }),
      ),
      ...kept.map(({ rule, fixed, broke, accounts }) =>
        this.prisma.inducedRule.updateMany({ where: textOf(rule), data: { fixed, broke, accounts } }),
      ),
      ...retired.map(({ rule }) =>
        this.prisma.inducedRule.updateMany({ where: { ...textOf(rule), retiredAt: null }, data: { retiredAt: now } }),
      ),
    ]);
  }
}
