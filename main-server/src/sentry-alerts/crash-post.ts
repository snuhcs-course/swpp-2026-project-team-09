/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { createHmac, timingSafeEqual } from 'node:crypto';

// What Sentry's issue alert (resource `event_alert`) tells of a crash, and the one Slack line made of it
// (README.md: Crash alerts from Sentry). Every field may be missing: a missing one only shortens the line.
export interface CrashAlert {
  title?: string;
  culprit?: string;
  level?: string;
  releaseTag?: string;
  platform?: string;
  link?: string;
}

// Sentry signs the body's bytes as it sent them: the hex HMAC-SHA256 with the integration's client secret.
export function signatureHolds(body: Buffer, signature: string | undefined, secret: string): boolean {
  if (signature === undefined || !/^[0-9a-f]{64}$/iu.test(signature)) {
    return false;
  }
  const expected = createHmac('sha256', secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, 'hex'));
}

function field(value: unknown, name: string): unknown {
  return typeof value === 'object' && value !== null ? (Reflect.get(value, name) as unknown) : undefined;
}

function text(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value : undefined;
}

// Sentry gives an event's tags as [name, value] pairs; its API elsewhere as { key, value }, which is taken too.
function tag(tags: unknown, name: string): string | undefined {
  if (!Array.isArray(tags)) {
    return undefined;
  }
  for (const entry of tags as unknown[]) {
    const [key, value] = Array.isArray(entry) ? (entry as unknown[]) : [field(entry, 'key'), field(entry, 'value')];
    if (key === name && text(value) !== undefined) {
      return text(value);
    }
  }
  return undefined;
}

// Only a link of ours to Sentry's own site: an https URL on sentry.io or one of its subdomains, holding nothing that
// would end Slack's <url|text> early.
function sentryLink(value: unknown): string | undefined {
  const url = URL.parse(text(value) ?? '');
  if (url === null || url.protocol !== 'https:' || url.username !== '' || url.password !== '') {
    return undefined;
  }
  if (url.hostname !== 'sentry.io' && !url.hostname.endsWith('.sentry.io')) {
    return undefined;
  }
  return /[|<>\s]/u.test(url.href) ? undefined : url.href;
}

export function readAlert(body: unknown): CrashAlert {
  const event = field(field(body, 'data'), 'event');
  const tags = field(event, 'tags');
  return {
    title: text(field(event, 'title')),
    culprit: text(field(event, 'culprit')),
    level: text(field(event, 'level')),
    releaseTag: tag(tags, 'release_tag'),
    platform: tag(tags, 'platform'),
    link: sentryLink(field(event, 'web_url')),
  };
}

// One line, at most `limit` characters, with Slack's control characters escaped, so that a crash's words can neither
// mention a channel or a person nor make a link.
function inert(value: string, limit: number): string {
  const characters = Array.from(value.replaceAll(/\s+/gu, ' ').trim());
  const cut = characters.length > limit ? `${characters.slice(0, limit - 1).join('')}…` : characters.join('');
  return cut.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

export const TITLE_LIMIT = 200;
const CULPRIT_LIMIT = 200;
const SHORT_LIMIT = 50;

export function crashPostText(alert: CrashAlert): string {
  const lines = [
    `App crash: ${alert.title === undefined ? 'an issue without a title' : inert(alert.title, TITLE_LIMIT)}`,
  ];
  const facts = [
    alert.culprit === undefined ? undefined : `at ${inert(alert.culprit, CULPRIT_LIMIT)}`,
    alert.level === undefined ? undefined : `level ${inert(alert.level, SHORT_LIMIT)}`,
    alert.releaseTag === undefined ? undefined : `release ${inert(alert.releaseTag, SHORT_LIMIT)}`,
    alert.platform === undefined ? undefined : `platform ${inert(alert.platform, SHORT_LIMIT)}`,
  ].filter((fact) => fact !== undefined);
  if (facts.length > 0) {
    lines.push(facts.join(' · '));
  }
  if (alert.link !== undefined) {
    lines.push(`<${alert.link.replaceAll('&', '&amp;')}|Open the issue in Sentry>`);
  }
  return lines.join('\n');
}
