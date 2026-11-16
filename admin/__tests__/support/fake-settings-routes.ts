/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { Setting, SettingChange } from '@/global-settings';
import type { Administrator } from '@/main-server';

import { SameEventRoutes } from './fake-same-event-routes';
import { FakeSettings } from './fake-settings';

// The main server's settings routes, apart from the fake's others.
export abstract class SettingsRoutes extends SameEventRoutes {
  readonly settings = new FakeSettings();

  protected abstract override answer<T>(
    request: string,
    token: string,
    work: (administrator: Administrator) => T,
  ): Promise<T>;

  listSettings = (token: string): Promise<Setting[]> =>
    this.answer('GET /admin/settings', token, () => this.settings.list());

  listSettingChanges = (token: string): Promise<SettingChange[]> =>
    this.answer('GET /admin/settings/history', token, () => this.settings.history());

  saveSetting = (token: string, name: string, value: string): Promise<{ appliesAt: string }> =>
    this.answer(`PUT /admin/settings/${name}`, token, ({ email }) => this.settings.save(name, value, email));
}
