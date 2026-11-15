/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service.js';
import { SETTING_REGISTRY } from './registered-settings.js';
import { SettingRefused } from './setting-refused.js';
import {
  appliesAt,
  parseValue,
  resolveRegistry,
  type ResolvedSetting,
  type SettingDefinition,
  type SettingValue,
  type ValueOf,
} from './registry.js';

export interface SettingRow extends Omit<ResolvedSetting, 'check' | 'label'> {
  readonly value: SettingValue;
}

// A setting as the Settings page shows it: each allowed value with its label, and its last change with when that
// applies. `value` is the one in effect on this pod.
export interface AdministratorSettingRow extends Omit<SettingRow, 'allowed'> {
  readonly allowed: readonly { readonly value: SettingValue; readonly label: string }[] | null;
  readonly lastChange: { readonly newValue: string; readonly appliesAt: Date } | null;
}

export interface SettingChangeRow {
  readonly name: string;
  readonly oldValue: string;
  readonly newValue: string;
  readonly administratorEmail: string;
  readonly changedAt: Date;
  readonly appliesAt: Date;
}

// How many changes the history gives.
const HISTORY_LENGTH = 100;

// The global settings, as this pod holds them. They are loaded at start and reloaded at second 0 of a minute when
// the revision changed, so every pod switches at the same minute and a read makes no query. README.md: Global
// settings.
@Injectable()
export class GlobalSettings implements OnModuleInit {
  private readonly logger = new Logger(GlobalSettings.name);
  private registry = new Map<string, ResolvedSetting>();
  private values = new Map<string, SettingValue>();
  private revision = -1;
  private checking = false;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(SETTING_REGISTRY) private readonly definitions: readonly SettingDefinition[],
  ) {}

  // Throws when the registry is wrong or the database cannot be read, so that the pod does not start.
  async onModuleInit(): Promise<void> {
    this.registry = resolveRegistry(this.definitions);
    await this.load();
  }

  // The value in effect: the loaded row's, or the default.
  get<Definition extends SettingDefinition>(definition: Definition): ValueOf<Definition> {
    const setting = this.setting(definition.name);
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- every value of the copy passed the setting's type
    return (this.values.get(setting.name) ?? setting.default) as ValueOf<Definition>;
  }

  // Every registered setting with the value in effect, in the registry's order.
  list(): SettingRow[] {
    return [...this.registry.values()].map(({ name, type, description, allowed, default: byDefault }) => ({
      name,
      type,
      description,
      default: byDefault,
      allowed,
      value: this.values.get(name) ?? byDefault,
    }));
  }

  // Every registered setting with the value in effect, as list() gives it, and the labels of its allowed values and its last change.
  async forAdministrators(): Promise<AdministratorSettingRow[]> {
    const latest = await this.prisma.settingChange.findMany({
      distinct: ['name'],
      orderBy: [{ name: 'asc' }, { revision: 'desc' }],
      select: { name: true, newValue: true, changedAt: true },
    });
    const lastChanges = new Map(latest.map((change) => [change.name, change]));
    return [...this.registry.values()].map(({ name, type, description, allowed, default: byDefault, label }) => {
      const change = lastChanges.get(name);
      return {
        name,
        type,
        description,
        default: byDefault,
        value: this.values.get(name) ?? byDefault,
        allowed: allowed?.map((value) => ({ value, label: label(value) })) ?? null,
        lastChange: change === undefined ? null : { newValue: change.newValue, appliesAt: appliesAt(change.changedAt) },
      };
    });
  }

  // Saves a value given as text, once it passed the setting's type, allowed values and own check, with its history row and the revision's increment, in one transaction. No pod reads
  // it, this one included, before the next minute's check, which is the time it answers.
  async save(name: string, text: string, administratorId: string): Promise<{ appliesAt: Date }> {
    const setting = this.registry.get(name);
    if (setting === undefined) {
      throw new SettingRefused(`${name} is not a setting.`);
    }
    const parsed = parseValue(setting, text);
    if (!parsed.ok) {
      throw new SettingRefused(parsed.reason);
    }
    const refusal = setting.check?.(parsed.value) ?? null;
    if (refusal !== null) {
      throw new SettingRefused(refusal);
    }
    const value = String(parsed.value);
    await this.prisma.$transaction(async (tx) => {
      // First, so that the row lock orders this save after any other still open, and its old value is read after it.
      const { revision } = await tx.settingsRevision.update({
        where: { id: 1 },
        data: { revision: { increment: 1 } },
      });
      const { email } = await tx.administrator.findUniqueOrThrow({ where: { id: administratorId } });
      const existing = await tx.setting.findUnique({ where: { name } });
      await tx.setting.upsert({
        where: { name },
        create: { name, valueType: setting.type, value },
        update: { valueType: setting.type, value },
      });
      await tx.settingChange.create({
        data: {
          name,
          oldValue: existing?.value ?? String(setting.default),
          newValue: value,
          administratorId,
          administratorEmail: email,
          revision,
        },
      });
    });
    return { appliesAt: appliesAt(new Date()) };
  }

  // The latest changes, newest first. A change's time is stamped when its transaction starts, so one committed just
  // after second 0 applies a minute later than its `appliesAt`.
  async history(): Promise<SettingChangeRow[]> {
    const changes = await this.prisma.settingChange.findMany({ orderBy: { revision: 'desc' }, take: HISTORY_LENGTH });
    return changes.map((change) => ({
      name: change.name,
      oldValue: change.oldValue,
      newValue: change.newValue,
      administratorEmail: change.administratorEmail,
      changedAt: change.changedAt,
      appliesAt: appliesAt(change.changedAt),
    }));
  }

  // Reads only the revision, and reloads every row when it changed. A failed check keeps the last copy. A check that
  // starts while the previous one is still running, as when the database is slow, is skipped.
  @Cron('0 * * * * *', { name: 'global-settings-check' })
  async check(): Promise<void> {
    if (this.checking) {
      return;
    }
    this.checking = true;
    try {
      const { revision } = await this.prisma.settingsRevision.findUniqueOrThrow({ where: { id: 1 } });
      if (revision !== this.revision) {
        await this.load();
      }
    } catch (error) {
      this.logger.error(`The settings' check failed; the last copy stays: ${String(error)}`);
    } finally {
      this.checking = false;
    }
  }

  private setting(name: string): ResolvedSetting {
    const setting = this.registry.get(name);
    if (setting === undefined) {
      throw new Error(`The setting ${name} is not registered.`);
    }
    return setting;
  }

  // The revision is read before the rows, so a save between the two reads is loaded again at the next check, never
  // missed. A row whose value no longer passes the registry, as when a value it allowed is gone, reads as its default.
  private async load(): Promise<void> {
    const { revision } = await this.prisma.settingsRevision.findUniqueOrThrow({ where: { id: 1 } });
    const rows = await this.prisma.setting.findMany();
    const values = new Map<string, SettingValue>();
    for (const row of rows) {
      const setting = this.registry.get(row.name);
      if (setting === undefined) {
        continue;
      }
      const parsed = row.valueType === setting.type ? parseValue(setting, row.value) : null;
      if (parsed?.ok === true) {
        values.set(row.name, parsed.value);
      } else {
        this.logger.warn(`The setting ${row.name} holds a value it does not take; it reads as its default.`);
      }
    }
    this.values = values;
    this.revision = revision;
  }
}
