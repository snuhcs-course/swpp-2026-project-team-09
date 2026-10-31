/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { load } from 'cheerio';
const R = process.env.REPO!; const POOL = process.argv[2];
const { parseEventPage } = await import(R + '/worker-server/src/event/event-page.parser.ts');
const { readEventTime } = await import(R + '/worker-server/src/event/event-time.ts');
const { namedPlace } = await import(R + '/main-server/src/global-events/named-place.ts');
const { readCampusBoundary } = await import(R + '/main-server/src/common/campus-boundary.ts');
const seed = R + '/main-server/seed';
const j = (f: string) => JSON.parse(readFileSync(`${seed}/${f}`, 'utf8'));
const boundary = await readCampusBoundary(seed);
const features = j('national-map-outlines.geojson').features;
const places = [
  ...j('campus-map-places.json').rows.filter((r: any) => r.inst_kor_nm !== 'Test').map((r: any) => ({
    id: `campus_map:${r.inst_seq}`, number: r.vil_dong_nm,
    name: /^관악 \S+동\[(.+)\]$/u.exec(r.inst_kor_nm)?.[1] ?? r.inst_kor_nm,
    latitude: Number(r.lat_val), longitude: Number(r.lon_val) })).filter((p: any) => boundary.contains(p)),
  ...j('openstreetmap-places.json').places.map((p: any) => ({ ...p, id: `openstreetmap:${p.id}` })),
  ...j('national-map-places.json').places.map((p: any) => {
    const [longitude, latitude] = features.find((f: any) => f.id === p.outline)?.geometry.coordinates[0][0] ?? [0, 0];
    return { id: `national_map:${p.outline}`, number: p.number, name: p.name, latitude, longitude }; }),
];
writeFileSync(`${POOL}/places.json`, JSON.stringify(places));
if (places.length !== 230) throw new Error(`Places ${places.length}`);
const clean = (s: string) => s.replaceAll(' ', ' ').replace(/\s+/g, ' ').trim();
const hasTime = (s: string | null) => !!s && s.includes('T');
const out: any[] = [];
for (const f of readdirSync(`${POOL}/raw`).sort()) {
  const m = /^(snu|extra)-(.+)\.html$/.exec(f)!; const html = readFileSync(`${POOL}/raw/${f}`, 'utf8');
  if (m[1] === 'snu') {
    let e: any; try { e = parseEventPage(html, Number(m[2])); } catch (err: any) { out.push({ source: 'snu', key: m[2], error: err.message }); continue; }
    const named = namedPlace(e.place, places);
    const links = [...html.matchAll(/dataSeq=(PGM\d+)/g)].map((x) => x[1]);
    out.push({ source: 'snu', key: m[2], title: e.title, body: e.description, bodyLen: e.description.length, imgs: (load(html)('.board-view .content img').length),
      links: [...new Set(links)], mentionsExtra: /extra\.snu|비교과/.test(e.description),
      sessions: [{ n: 1, start: e.start, end: e.end, readFrom: e.readFrom, place: e.place, placeId: named?.id ?? null, placeName: named?.name ?? null,
        rulesPublish: e.readFrom === 'body' && hasTime(e.start) && named !== null }] });
  } else {
    const $ = load(html);
    const title = clean($('.prog_tit, .tit, h3').first().text());
    const fields: Record<string, string> = {};
    $('dt, th').each((_, el) => { const k = clean($(el).text()); const v = clean($(el).next('dd, td').text()); if (k && v && !fields[k]) fields[k] = v; });
    const sessions: any[] = []; let cur: any = null;
    $('#intlNsbjtLtrInfoList tr, table.add_tr tr').each((_, tr) => {
      const head = $(tr).find('th.bg2'); const label = clean($(tr).find('th').last().text()); const v = clean($(tr).find('td').last().text());
      if (head.length) { const n = /\[(\d+)\]/.exec(head.text())?.[1]; cur = { n: Number(n) }; sessions.push(cur); }
      if (!cur) return;
      if (label === '강좌명') cur.name = v;
      if (label.includes('장소')) cur.place = v;
      if (label.includes('기간')) cur.period = v;
    });
    const seen = new Set<number>(); const uniq = sessions.filter((s) => (seen.has(s.n) ? false : (seen.add(s.n), true)));
    for (const s of uniq) {
      const t = s.period ? readEventTime(s.period) : null; const named = namedPlace(s.place ?? null, places);
      s.start = t?.start ?? null; s.end = t?.end ?? null; s.placeId = named?.id ?? null; s.placeName = named?.name ?? null; s.readFrom = t ? 'fields' : null;
      s.rulesPublish = hasTime(s.start) && named !== null;
    }
    const pageTitle = clean($('.title_area, .prog_info .tit, .cont_box .tit').first().text());
    const body = clean($('.cont_box').filter((_, b) => $(b).find('.cont_tit').text().includes('주요내용')).text());
    out.push({ source: 'extra', key: m[2], title: pageTitle || title, fields: { 신청기간: fields['신청기간'], 활동기간: fields['활동기간'], 운영부서: fields['운영부서'] }, body, bodyLen: body.length,
      links: [...new Set([...html.matchAll(/bbsidx=(\d+)/g)].map((x) => x[1]))], sessions: uniq });
  }
}
writeFileSync(`${POOL}/analysis.json`, JSON.stringify(out, null, 1));
const n = (f: (x: any) => boolean) => out.filter(f).length;
console.log({ total: out.length, snu: n((x) => x.source === 'snu'), extra: n((x) => x.source === 'extra'), errors: n((x) => x.error),
  snuDraft: n((x) => x.source === 'snu' && !x.error && !x.sessions[0].rulesPublish), extraDraft: n((x) => x.source === 'extra' && x.sessions.some((s: any) => !s.rulesPublish)),
  extraNoSessions: n((x) => x.source === 'extra' && x.sessions.length === 0) });
