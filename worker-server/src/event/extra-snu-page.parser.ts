/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type CheerioAPI, load } from 'cheerio';
import { type CollectedPost, type CollectedSession } from './dto/events-collected.dto.js';
import { bodyLines, clean } from './event-page.parser.js';
import { readEventTime } from './event-time.js';
import { programmeAddress } from './extra-snu-list.js';

const MIDNIGHT = 'T00:00:00+09:00';
const A_DAY = 24 * 60 * 60 * 1000;

// The site's notice refuses the automatic collection of the addresses it shows, so none leaves the worker.
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gu;
const EMAIL_MASK = '[이메일]';

// The page's own programme is named by a scrap button: {"pgmType":"PGM01" ,"pgmSeq":"2002414", ...}.
const PROGRAMME_NAME = /"pgmType":"(\w+)"\s*,\s*"pgmSeq":"(\d+)"/u;

function keyOf($: CheerioAPI): string | null {
  const name = PROGRAMME_NAME.exec($('.scrap input').attr('data-params') ?? '');
  return name === null ? null : `${name[1]}${name[2]}`;
}

// A session's period field, "2026.11.02. 10:00 ~ 2026.11.02. 11:00". The site fills in 00:00 where it has no time of
// day, so a start at 00:00 is sent as a day. A session over a day, often a period to apply or to take part in, is not one
// sitting: its time is kept for an Administrator and the Judgement, and not for the rules to publish.
function timeOf(period: string): Pick<CollectedSession, 'start' | 'end' | 'readFrom'> {
  const time = readEventTime(period);
  if (time === null) {
    return { start: null, end: null, readFrom: null };
  }
  const isOverADay = time.end !== null && Date.parse(time.end) - Date.parse(time.start) > A_DAY;
  return {
    start: time.start.endsWith(MIDNIGHT) ? time.start.slice(0, -MIDNIGHT.length) : time.start,
    end: time.end,
    readFrom: isOverADay ? null : 'body',
  };
}

interface SessionFields {
  number: string;
  // As the page writes them, "" when it writes none. The site shows a place it was not given as "-".
  period: string;
  place: string;
}

// The rows of the page's session tables, each with a label and its value. A row whose head reads "[1] 회차" starts a
// session; the rows of a table before the first session say nothing about one.
function sessionFieldsOf($: CheerioAPI): SessionFields[] {
  const sessions: { number: string; rows: { label: string; value: string }[] }[] = [];
  for (const row of $('[id="intlNsbjtLtrInfoList"] tr').toArray()) {
    const head = $(row).find('th.bg2');
    if (head.length > 0) {
      const number = /\[(\d+)\]/u.exec(head.text())?.[1];
      if (number === undefined) {
        throw new Error('A session has no number');
      }
      sessions.push({ number, rows: [] });
    }
    sessions.at(-1)?.rows.push({
      label: clean($(row).find('th').last().text()),
      value: clean($(row).find('td').last().text()).replaceAll(/\s+/gu, ' '),
    });
  }
  return sessions.map(({ number, rows }) => {
    const field = (label: string): string => rows.find((row) => row.label.includes(label))?.value ?? '';
    const place = field('장소');
    // A period of only its "~" says nothing.
    const period = field('기간');
    return { number, period: /\d/u.test(period) ? period : '', place: place === '-' ? '' : place };
  });
}

function toSession({ number, period, place }: SessionFields, title: string | null): CollectedSession {
  const { start, end, readFrom } = timeOf(period);
  const session: CollectedSession = {
    number: Number(number),
    start,
    end,
    readFrom,
    place: place === '' ? null : place,
  };
  if (title !== null) {
    session.title = `${title} (${number}회차)`;
  }
  return session;
}

// A session's fields as a line of the description, since a Judgement reads a post's title and text alone, and quotes
// them. Null when the page gives neither.
function sessionLine({ number, period, place }: SessionFields): string | null {
  const parts = [period === '' ? '' : `기간: ${period}`, place === '' ? '' : `장소: ${place}`].filter(
    (part) => part !== '',
  );
  return parts.length === 0 ? null : `[${number}회차] ${parts.join(' / ')}`;
}

// The programme's summary, its sessions, its application period and its main text, one line per line of the page. The
// sessions come before the application period, so that a Judgement does not take a session's line for that period.
function descriptionOf($: CheerioAPI, sessions: SessionFields[]): string {
  const applicationPeriod = clean($('dl.date dd').first().text()).replaceAll(/\s+/gu, ' ');
  return [
    clean($('.text_wrap .desc').first().text()),
    ...sessions.flatMap((session) => sessionLine(session) ?? []),
    `신청기간: ${applicationPeriod}`,
    ...bodyLines($, '.cont_box:has(.cont_tit:contains("주요내용")) .td_box'),
  ]
    .filter((line) => line !== '')
    .join('\n')
    .replaceAll(EMAIL, EMAIL_MASK);
}

// One Source Post with one session per 회차, from a programme's page.
export function parseExtraSnuPage(html: string, key: string): CollectedPost {
  const $ = load(html);
  // Another page, such as an error page, can come with status 200 too, so the content is checked.
  const pageKey = keyOf($);
  if (pageKey === null) {
    throw new Error('The page has no programme');
  }
  if (pageKey !== key) {
    throw new Error(`The page is not programme ${key}`);
  }
  const title = clean($('.text_wrap .tit').first().text()).replaceAll(/\s+/gu, ' ');
  if (title === '') {
    throw new Error('The programme has no title');
  }
  const sessions = sessionFieldsOf($);
  if (sessions.length === 0) {
    throw new Error('The programme has no sessions');
  }
  return {
    key,
    address: programmeAddress(key),
    title,
    description: descriptionOf($, sessions),
    sessions: sessions.map((session) => toSession(session, sessions.length > 1 ? title : null)),
  };
}
