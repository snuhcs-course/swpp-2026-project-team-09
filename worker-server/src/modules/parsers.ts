import { load } from 'cheerio';
export function validDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
}
export function seoulDate() { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month:'2-digit', day:'2-digit' }).format(new Date()); }
export function parseMeals(html: string, date: string) {
  const $ = load(html);
  if ($('input[name="date"]').val() !== date || !$('table.menu-table').length) throw new Error('Meal source date or table mismatch');
  $('br').replaceWith('\n');
  const items: { restaurant:string; breakfast:string; lunch:string; dinner:string }[] = [];
  $('table.menu-table tbody tr').each((_, row) => {
    const field = (name: string) => $(row).find(`td.${name}`).text().replace(/[ \t]+/g, ' ').replace(/\n\s*\n/g, '\n').trim();
    const restaurant = field('title');
    if (restaurant) items.push({ restaurant, breakfast:field('breakfast'), lunch:field('lunch'), dinner:field('dinner') });
  });
  return items;
}
export function parseVehicles(value: unknown) {
  if (!value || typeof (value as any).d !== 'string') throw new Error('Invalid vehicle source envelope');
  const raw = (value as any).d as string;
  if (!raw.trim()) return [];
  return raw.split(';').filter(Boolean).map(row => {
    const [id, x, y, count, label, ...rest] = row.split('/');
    if (!id || !x?.trim() || !y?.trim() || !count?.trim() || label === undefined || rest.length !== 1 || ![x,y,count].every(v => Number.isFinite(Number(v))) || Number(count) < 1 || !Number.isInteger(Number(count))) throw new Error('Malformed vehicle source row');
    return {id, x:Number(x), y:Number(y), count:Number(count), label};
  });
}
export function parseStops(html: string) {
  const $ = load(html);
  const stops: {name:string;x:number;y:number}[] = [];
  $('.route_point').each((_, node) => {
    const style = $(node).attr('style') || '';
    const x = /left\s*:\s*(-?[\d.]+)px/.exec(style), y = /top\s*:\s*(-?[\d.]+)px/.exec(style);
    const name = $(node).find('em').text().trim();
    if (x && y && name) stops.push({name,x:Number(x[1]),y:Number(y[1])});
  });
  if (!stops.length) throw new Error('Source stop layout unavailable');
  return stops;
}
export function eventLinks(html: string) {
  const $ = load(html);
  return $('.board-imgline a.item[href*="bbsidx"]').map((_, el) => new URL($(el).attr('href')!, 'https://www.snu.ac.kr').href).get().slice(0, 5);
}
export function parseEvent(html: string, sourceUrl: string) {
  const $ = load(html); $('br').replaceWith('\n'); $('p,div').append('\n');
  const title = $('.board-view .header .title').text().trim();
  const description = $('.board-view .content').text().replace(/[ \t]+/g, ' ').trim();
  const line = description.split('\n').find(s => /일\s*시\s*:/.test(s));
  const locationName = description.split('\n').find(s => /장\s*소\s*:/.test(s))?.replace(/^.*?장\s*소\s*:\s*/, '').trim();
  // Deliberately accept only a complete same-day time range attached to an explicit date.
  const m = line && /일\s*시\s*:\s*(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?(?:\s*\([^)]*\))?\s*(\d{1,2}):(\d{2})\s*[-~–]\s*(\d{1,2}):(\d{2})\s*$/.exec(line);
  if (!title || !locationName || !m) return null;
  const date = `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  if (!validDate(date) || +m[4] > 23 || +m[6] > 23 || +m[5] > 59 || +m[7] > 59) return null;
  const startsAt = new Date(`${date}T${m[4].padStart(2,'0')}:${m[5]}:00+09:00`).toISOString();
  const endsAt = new Date(`${date}T${m[6].padStart(2,'0')}:${m[7]}:00+09:00`).toISOString();
  if (endsAt <= startsAt) return null;
  return { externalId:new URL(sourceUrl).searchParams.get('bbsidx')!, title,description,startsAt,endsAt,locationName,sourceUrl };
}
