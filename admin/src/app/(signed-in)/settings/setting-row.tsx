/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

'use client';

import { type ReactElement, useActionState, useEffect, useState } from 'react';

import type { Setting, SettingValue } from '@/global-settings';
import { inSeoul } from '@/seoul-time';

import { saveSetting } from './actions';

// The values the input offers, each with its label: the allowed ones, or true and false for a switch.
function choicesOf({ type, allowed }: Setting): { value: string; label: string }[] | null {
  if (allowed !== null) {
    return allowed.map(({ value, label }) => ({ value: String(value), label }));
  }
  return type === 'BOOLEAN' ? ['true', 'false'].map((value) => ({ value, label: value })) : null;
}

function labelOf(setting: Setting, value: SettingValue | string): string {
  return setting.allowed?.find((each) => String(each.value) === String(value))?.label ?? String(value);
}

// "applies at HH:MM:00" in Seoul until that minute has passed, then "applied". Keyed by the time, so that a new save
// starts it again.
function ChangeState({ appliesAt }: { appliesAt: string }): ReactElement {
  const [applied, setApplied] = useState(() => Date.parse(appliesAt) <= Date.now());
  useEffect(() => {
    // A wait that has already passed runs at once.
    const timer = setTimeout(
      () => {
        setApplied(true);
      },
      Math.max(0, Date.parse(appliesAt) - Date.now()),
    );
    return (): void => {
      clearTimeout(timer);
    };
  }, [appliesAt]);
  return <span>{applied ? 'applied' : `applies at ${inSeoul(appliesAt).time}:00`}</span>;
}

// The input for the setting's type and allowed values: a select of the choices when it has them. Keyed by the saved
// value, so that a save shows the new one.
function ValueInput({ setting, id, saved }: { setting: Setting; id: string; saved: string }): ReactElement {
  const choices = choicesOf(setting);
  return choices === null ? (
    <input
      key={saved}
      id={id}
      name="value"
      type={setting.type === 'INTEGER' ? 'number' : 'text'}
      step={setting.type === 'INTEGER' ? 1 : undefined}
      defaultValue={saved}
      className="input w-full max-w-xs"
    />
  ) : (
    <select key={saved} id={id} name="value" defaultValue={saved} className="input w-full max-w-xs">
      {choices.map(({ value, label }) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </select>
  );
}

// A setting's input and a save that asks first.
function SettingForm({
  setting,
  action,
  pending,
}: {
  setting: Setting;
  action: (form: FormData) => void;
  pending: boolean;
}): ReactElement {
  const saved = setting.lastChange?.newValue ?? String(setting.value);
  const inputId = `setting-${setting.name}`;
  return (
    <form
      action={action}
      onSubmit={(event) => {
        const value = new FormData(event.currentTarget).get('value');
        const label = labelOf(setting, typeof value === 'string' ? value : '');
        if (!window.confirm(`Change ${setting.name} to ${label}? It applies on every server at the next minute.`)) {
          event.preventDefault();
        }
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="name" value={setting.name} />
      <label className="sr-only" htmlFor={inputId}>
        New value of {setting.name}
      </label>
      <ValueInput setting={setting} id={inputId} saved={saved} />
      <button type="submit" disabled={pending} className="button button-primary">
        Save
      </button>
    </form>
  );
}

// One registered setting: its value in effect, its form, the reason a save was refused, and its last change.
export function SettingRow({ setting }: { setting: Setting }): ReactElement {
  const [refusal, saveAction, pending] = useActionState(saveSetting, null);

  return (
    <tr>
      <td>
        <p className="font-medium">{setting.name}</p>
        <p className="text-sm text-zinc-600">{setting.description}</p>
      </td>
      <td>{labelOf(setting, setting.value)}</td>
      <td>
        <SettingForm setting={setting} action={saveAction} pending={pending} />
        {refusal !== null && !pending && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {refusal}
          </p>
        )}
      </td>
      <td>
        {setting.lastChange === null ? (
          <span className="text-zinc-500">Never changed</span>
        ) : (
          <ChangeState key={setting.lastChange.appliesAt} appliesAt={setting.lastChange.appliesAt} />
        )}
      </td>
    </tr>
  );
}
