import { type CheerioAPI, load } from 'cheerio';
import { type CollectedEvent } from './dto/events-collected.dto.js';
import { readEventTime } from './event-time.js';

// The labels of the body's time line and place line, without their spaces. A label that only ends with one, such as
// 신청 기간 or 접수기간, is another line: application periods stay in the description.
const TIME_LABELS = new Set(['일시', '일자', '일정', '기간']);
const PLACE_LABELS = new Set(['장소']);

// Marks a line break of the page in the text, apart from the line breaks of the HTML source.
const LINE_BREAK = '\u2028';

// The lines of the body as a browser shows them, with no-break spaces as spaces.
function bodyLines($: CheerioAPI): string[] {
  const body = $('.board-view .content').first();
  body.find('br').replaceWith(LINE_BREAK);
  body
    .find('p, div, ul, ol, li, table, caption, tr, th, td, h1, h2, h3, h4, h5, h6, blockquote')
    .before(LINE_BREAK)
    .after(LINE_BREAK);
  return (
    body
      .text()
      // As in a browser, a run of the source's white space is one space.
      .replaceAll(/[ \t\r\n]+/gu, ' ')
      .split(LINE_BREAK)
      .map((line) => line.replaceAll('\u00A0', ' ').trim())
      .filter((line) => line !== '')
  );
}

// "· 일   시: 2026. 10. 13.(화) 19:30" is the label 일시 and its value, whatever comes before the label's first letter.
function labelled(line: string): { label: string; value: string } | null {
  const match = /^[^가-힣]*([가-힣][가-힣 ]*?)\s*[:：]\s*(.*)$/u.exec(line);
  return match === null ? null : { label: match[1].replaceAll(' ', ''), value: match[2] };
}

// The value of the first line with one of the labels and a value.
function valueOf(lines: string[], labels: Set<string>): string | null {
  for (const line of lines) {
    const field = labelled(line);
    if (field !== null && field.value !== '' && labels.has(field.label)) {
      return field.value;
    }
  }
  return null;
}

// The start and end from the body's time line, or failing it from the header's date, which is often the application
// period.
function timeOf(timeLine: string | null, headerDate: string): Pick<CollectedEvent, 'start' | 'end' | 'readFrom'> {
  const bodyTime = timeLine === null ? null : readEventTime(timeLine);
  if (bodyTime !== null) {
    return { ...bodyTime, readFrom: 'body' };
  }
  const headerTime = readEventTime(headerDate);
  if (headerTime !== null) {
    return { ...headerTime, readFrom: 'header' };
  }
  return { start: null, end: null, readFrom: null };
}

// Reads a post of the events list from its page.
export function parseEventPage(html: string): CollectedEvent {
  const $ = load(html);
  const view = $('.board-view');
  const title = view.find('.header .title').text().replaceAll('\u00A0', ' ').trim();
  const sourceUrl = $('link[rel="canonical"]').attr('href') ?? '';
  const postNumber = /[?&]bbsidx=(\d+)/u.exec(sourceUrl)?.[1];
  // A blocked request is answered with status 200 and another page, so the content is checked.
  if (view.find('.content').length === 0 || title === '' || postNumber === undefined) {
    throw new Error('The page has no post');
  }
  const lines = bodyLines($);
  return {
    postNumber: Number(postNumber),
    sourceUrl,
    title,
    description: lines.join('\n'),
    ...timeOf(valueOf(lines, TIME_LABELS), view.find('.header .date').text()),
    place: valueOf(lines, PLACE_LABELS),
  };
}
