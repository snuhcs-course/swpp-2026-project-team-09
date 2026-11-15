/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';

import { mainServer } from '@/main-server';
import { asAdministrator } from '@/session';

import { SettingHistory } from './setting-history';
import { SettingRow } from './setting-row';

// Every global setting the main server registers, and the history of their changes (main-server README: Global
// settings). Any Administrator may change any setting.
export default async function SettingsPage(): Promise<ReactElement> {
  const [settings, changes] = await asAdministrator('/settings', (token) =>
    Promise.all([mainServer.listSettings(token), mainServer.listSettingChanges(token)]),
  );
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <h1>Settings</h1>
        <p className="text-sm text-zinc-600">
          A saved value applies on every server at the next minute. Times are in Seoul.
        </p>
      </header>
      <div className="card overflow-x-auto">
        <table className="data-table" aria-label="Settings">
          <thead>
            <tr>
              <th>Setting</th>
              <th>Value</th>
              <th>New value</th>
              <th>Last change</th>
            </tr>
          </thead>
          <tbody>
            {settings.map((setting) => (
              <SettingRow key={setting.name} setting={setting} />
            ))}
          </tbody>
        </table>
      </div>
      <SettingHistory changes={changes} />
    </div>
  );
}
