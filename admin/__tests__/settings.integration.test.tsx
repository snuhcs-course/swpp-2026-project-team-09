/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { act, fireEvent, screen, within } from '@testing-library/react';

import { fakeMainServer } from './support/fake-main-server';
import { openSettings, rowsOf, signInAs } from './support/pages';

// 14:00:20 in Seoul, so that a save applies at 14:01:00.
const NOW = new Date('2026-11-15T05:00:20.000Z');

function llmKeyRow(): HTMLElement {
  return screen.getByRole('row', { name: (name) => name.startsWith('llm.key ') });
}

function chooseKey(value: string): void {
  fireEvent.change(within(llmKeyRow()).getByRole('combobox', { name: 'New value of llm.key' }), {
    target: { value },
  });
}

function save(): void {
  fireEvent.click(within(llmKeyRow()).getByRole('button', { name: 'Save' }));
}

beforeEach(() => {
  vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true, toFake: ['Date', 'setTimeout', 'clearTimeout'] });
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  fakeMainServer.hasAdministrators('kim@snu.ac.kr');
  signInAs('kim@snu.ac.kr');
});

afterEach(() => {
  vi.useRealTimers();
});

describe('the Settings page', () => {
  it("lists llm.key with its value and a select of the keys' names with their providers", async () => {
    await openSettings();

    expect(within(llmKeyRow()).getAllByRole('cell')[1]).toHaveTextContent('default (OpenRouter)');
    expect(
      within(llmKeyRow())
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['default (OpenRouter)', 'claude (Anthropic)']);
    expect(within(llmKeyRow()).getByText('Never changed')).toBeVisible();
    expect(screen.getByText('No setting has been changed.')).toBeVisible();
  });

  it('is in the menu', async () => {
    await openSettings();

    expect(screen.getAllByRole('link', { name: 'Settings' })[0]).toHaveAttribute('href', '/settings');
  });
});

describe('saving a setting', () => {
  it('asks first, then shows "applies at" the next minute, and "applied" once it has passed', async () => {
    await openSettings();

    chooseKey('claude');
    save();

    expect(window.confirm).toHaveBeenCalledWith(
      'Change llm.key to claude (Anthropic)? It applies on every server at the next minute.',
    );
    expect(await within(llmKeyRow()).findByText('applies at 14:01:00')).toBeVisible();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(40_000);
    });
    expect(within(llmKeyRow()).getByText('applied')).toBeVisible();
  });

  it('sends nothing when the person does not confirm', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    await openSettings();

    chooseKey('claude');
    save();

    expect(fakeMainServer.requests.filter((request) => request.startsWith('PUT'))).toEqual([]);
  });

  it('shows the reason the main server refused a value', async () => {
    fakeMainServer.settings.hasNoKey('claude');
    await openSettings();

    chooseKey('claude');
    save();

    expect(await within(llmKeyRow()).findByRole('alert')).toHaveTextContent('The server has no key named claude.');
    expect(within(llmKeyRow()).getByText('Never changed')).toBeVisible();
  });
});

describe('a setting saved earlier', () => {
  it('shows "applied" for a change whose minute has passed', async () => {
    fakeMainServer.settings.hasChange({
      name: 'llm.key',
      oldValue: 'default',
      newValue: 'claude',
      administratorEmail: 'lee@gmail.com',
      changedAt: '2026-11-15T04:30:10.000Z',
      appliesAt: '2026-11-15T04:31:00.000Z',
    });
    await openSettings();

    expect(within(llmKeyRow()).getByText('applied')).toBeVisible();
    expect(within(llmKeyRow()).getByRole('combobox', { name: 'New value of llm.key' })).toHaveValue('claude');
  });
});

describe('the history', () => {
  it('lists who changed what, when, and the old and new values, newest first', async () => {
    fakeMainServer.settings.hasChange({
      name: 'llm.key',
      oldValue: 'default',
      newValue: 'claude',
      administratorEmail: 'lee@gmail.com',
      changedAt: '2026-11-15T04:30:10.000Z',
      appliesAt: '2026-11-15T04:31:00.000Z',
    });
    await openSettings();

    chooseKey('default');
    save();

    await vi.waitFor(() => {
      expect(rowsOf('History')).toEqual([
        ['2026-11-15 14:00', 'llm.key', 'claude', 'default', 'kim@snu.ac.kr'],
        ['2026-11-15 13:30', 'llm.key', 'default', 'claude', 'lee@gmail.com'],
      ]);
    });
  });
});
