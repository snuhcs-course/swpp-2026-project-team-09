import { type CheerioAPI, load } from 'cheerio';
import { type CollectedEvent } from './dto/events-collected.dto.js';
import { readEventTime } from './event-time.js';
import { postAddress } from './events-list.js';

// The labels of the body's time line and place line, without their spaces. A time label that only ends with one, such
// as 신청 기간 or 접수기간, is another line: application periods stay in the description. A place label may name the
// event's own place, as 교육 장소 or 오프라인 장소 do, but not 집결 장소 or 신청 장소, which are somewhere else.
const TIME_LABELS = new Set(['일시', '일자', '일정', '기간']);
const PLACE_LABEL = /^(?:행사|개최|교육|강연|강의|오프라인|대면|일시및|일시와|시간및|시간과)?장소$/u;

// Marks a line break of the page in the text, apart from the line breaks of the HTML source.
const LINE_BREAK = '\u2028';

export function clean(text: string): string {
  return text.replaceAll('\u00A0', ' ').trim();
}

// The lines of the body as a browser shows them.
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
      .map((line) => clean(line))
      .filter((line) => line !== '')
  );
}

// "· 일   시: 2026. 10. 13.(화) 19:30" is the label 일시 and its value, whatever comes before the label's first letter. A
// "]" or a "|" may stand for the colon: "• 장소] 50동 301호", "장소 | 4동 309호".
const FIELD = /^[^가-힣]*([가-힣][가-힣 ]*?)\s*[:：\]|]\s*(.*)$/u;

// A label on a line of its own, "4. 장소", whose value is the line after it.
const HEADING = /^[^가-힣]*([가-힣][가-힣 ]*?)\s*$/u;

function labelled(line: string, next: string | undefined): { label: string; value: string } | null {
  const field = FIELD.exec(line);
  if (field !== null) {
    return { label: field[1].replaceAll(' ', ''), value: field[2] };
  }
  const heading = HEADING.exec(line);
  if (heading === null || next === undefined || FIELD.test(next) || HEADING.test(next)) {
    return null;
  }
  // Without the bullet the value's line starts with.
  return { label: heading[1].replaceAll(' ', ''), value: next.replace(/^[^\p{L}\p{N}(]+/u, '') };
}

function firstValue(lines: string[], isLabel: (label: string) => boolean): string | null {
  for (const [index, line] of lines.entries()) {
    const field = labelled(line, lines[index + 1]);
    if (field !== null && field.value !== '' && isLabel(field.label)) {
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

export function parseEventPage(html: string, postNumber: number): CollectedEvent {
  const $ = load(html);
  const view = $('.board-view');
  const title = clean(view.find('.header .title').text());
  // A blocked request is answered with status 200 and another page, so the content is checked.
  if (view.find('.content').length === 0 || title === '') {
    throw new Error('The page has no post');
  }
  const sourceUrl = postAddress(postNumber);
  if ($('link[rel="canonical"]').attr('href') !== sourceUrl) {
    throw new Error(`The page is not post ${postNumber}`);
  }
  const lines = bodyLines($);
  return {
    postNumber,
    sourceUrl,
    title,
    description: lines.join('\n'),
    ...timeOf(
      firstValue(lines, (label) => TIME_LABELS.has(label)),
      view.find('.header .date').text(),
    ),
    place: firstValue(lines, (label) => PLACE_LABEL.test(label)),
  };
}
