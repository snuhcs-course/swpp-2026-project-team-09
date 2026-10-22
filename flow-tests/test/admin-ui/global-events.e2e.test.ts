/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { Page } from 'playwright';
import { z } from 'zod';
import { NEW_MEDIA_INSTITUTE, seoulDay } from '../campus.js';
import { signIn } from '../people.js';
import { it } from './browser.js';

// A Global Event as a User's app reads it from GET /global-events (main-server/README.md, Global Events).
const listedEvent = z.object({
  title: z.string(),
  description: z.string(),
  startsAt: z.string().nullable(),
  endsAt: z.string().nullable(),
  place: z.string().nullable(),
  latitude: z.number(),
  longitude: z.number(),
});

const TOMORROW_IN_SEOUL = seoulDay(new Date(Date.now() + 24 * 60 * 60 * 1000));

// Seoul keeps UTC+9 all year.
function seoulInstant(day: string, time: string): string {
  return new Date(`${day}T${time}:00+09:00`).toISOString();
}

// The Administrator opens the site, is sent to sign in, presses Google's button and lands on the Events page.
async function theAdministratorSignsIn(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForURL((url) => url.pathname === '/sign-in');
  await page.getByRole('button', { name: 'Sign in with Google' }).click();
  await page.waitForURL((url) => url.pathname === '/');
  await page.getByRole('heading', { name: 'Events', exact: true }).waitFor();
}

async function opensTheNewEventForm(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'New event' }).click();
  await page.getByRole('heading', { name: 'New event' }).waitFor();
}

// Answers when the Draft's page shows it.
async function createsTheDraft(page: Page, title: string): Promise<void> {
  await page.getByRole('button', { name: 'Create the Draft' }).click();
  await page.waitForURL((url) => url.pathname.startsWith('/events/') && url.pathname !== '/events/new');
  await page.getByRole('heading', { name: title }).waitFor();
  await page.getByText('Draft', { exact: true }).waitFor();
}

// The Draft's page says what publishing needs, and Publish cannot be pressed.
async function theDraftNeeds(page: Page, needed: string): Promise<void> {
  await page.getByText(`To publish, add ${needed}.`, { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Publish', disabled: true }).waitFor();
}

// The Events page lists the Draft with what it still needs, from the main server's `missing`.
async function theListSaysItStillNeeds(page: Page, title: string, stillNeeds: string): Promise<void> {
  await page.getByRole('link', { name: '← Events' }).click();
  const drafts = page.getByRole('table', { name: 'Drafts' });
  await drafts.getByRole('columnheader', { name: 'Still needs' }).waitFor();
  const row = drafts.getByRole('row').filter({ has: page.getByRole('link', { name: title, exact: true }) });
  await row.getByRole('cell', { name: stillNeeds, exact: true }).waitFor();
}

it('W1: an Administrator publishes a Draft on the admin site, and a connected User is told and sees it', async ({
  page,
}) => {
  const minji = await signIn('김민지');
  await theAdministratorSignsIn(page);

  const title = '지능형통신 연합전공 설명회';
  const description = '연합전공 설명회입니다.';
  const place = '뉴미디어통신공동연구소 이충웅홀(132동 103호)';
  await opensTheNewEventForm(page);
  await page.getByRole('textbox', { name: 'Title' }).fill(title);
  await page.getByRole('textbox', { name: 'Description' }).fill(description);
  await page.getByRole('textbox', { name: 'Start day' }).fill(TOMORROW_IN_SEOUL);
  await page.getByRole('textbox', { name: 'Start time' }).fill('18:30');
  await page.getByRole('textbox', { name: 'End day' }).fill(TOMORROW_IN_SEOUL);
  await page.getByRole('textbox', { name: 'End time' }).fill('20:00');
  await page.getByRole('textbox', { name: 'Place name' }).fill(place);
  await page.getByRole('spinbutton', { name: 'Latitude' }).fill(String(NEW_MEDIA_INSTITUTE.latitude));
  await page.getByRole('spinbutton', { name: 'Longitude' }).fill(String(NEW_MEDIA_INSTITUTE.longitude));
  await createsTheDraft(page, title);
  expect(await minji.get('/global-events', z.array(listedEvent))).toEqual([]);

  // The browser context accepts the question Publish asks.
  await page.getByRole('button', { name: 'Publish' }).click();
  await page.getByText('Published', { exact: true }).waitFor();
  await minji.inbox.receivesSignal('global-events-changed');
  expect(await minji.get('/global-events', z.array(listedEvent))).toEqual([
    {
      title,
      description,
      startsAt: seoulInstant(TOMORROW_IN_SEOUL, '18:30'),
      endsAt: seoulInstant(TOMORROW_IN_SEOUL, '20:00'),
      place,
      ...NEW_MEDIA_INSTITUTE,
    },
  ]);
});

it('W2: a Draft without a start or a position cannot be published, the site names what is missing, and no User is told', async ({
  page,
}) => {
  const minji = await signIn('김민지');
  await theAdministratorSignsIn(page);

  const title = '연합전공 설명회 (시간 미정)';
  await opensTheNewEventForm(page);
  await page.getByRole('textbox', { name: 'Title' }).fill(title);
  await createsTheDraft(page, title);
  await theDraftNeeds(page, 'a start and a position');
  await theListSaysItStillNeeds(page, title, 'Start, Position');

  await page.getByRole('link', { name: title, exact: true }).click();
  await page.getByRole('textbox', { name: 'Start day' }).fill(TOMORROW_IN_SEOUL);
  await page.getByRole('textbox', { name: 'Start time' }).fill('10:00');
  // The Server Action posts to the page's own address and answers once the main server has saved the start.
  const saved = page.waitForResponse(
    (response) => response.request().method() === 'POST' && response.url() === page.url(),
  );
  await page.getByRole('button', { name: 'Save' }).click();
  await saved;
  await theDraftNeeds(page, 'a position');
  await theListSaysItStillNeeds(page, title, 'Position');

  await minji.inbox.receivesNo('global-events-changed', z.unknown(), () => true);
  expect(await minji.get('/global-events', z.array(listedEvent))).toEqual([]);
});
