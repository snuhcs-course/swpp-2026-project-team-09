/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import type { ReactElement } from 'react';

import type { SettingChange } from '@/global-settings';
import { formatInSeoul } from '@/seoul-time';

// Who changed which setting, when, and the old and new value, newest first as the main server lists them.
export function SettingHistory({ changes }: { changes: SettingChange[] }): ReactElement {
  return (
    <section className="space-y-3">
      <h2 id="history">History</h2>
      {changes.length === 0 ? (
        <p className="text-sm text-zinc-600">No setting has been changed.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table" aria-labelledby="history">
            <thead>
              <tr>
                <th>Changed at</th>
                <th>Setting</th>
                <th>Old value</th>
                <th>New value</th>
                <th>Administrator</th>
              </tr>
            </thead>
            <tbody>
              {changes.map((change) => (
                <tr key={`${change.changedAt} ${change.name}`}>
                  <td>{formatInSeoul(change.changedAt)}</td>
                  <td>{change.name}</td>
                  <td>{change.oldValue}</td>
                  <td>{change.newValue}</td>
                  <td>{change.administratorEmail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
