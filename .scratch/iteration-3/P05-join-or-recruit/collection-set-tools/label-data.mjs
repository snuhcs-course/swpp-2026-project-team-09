/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Builds the labelling page's data from the committed label files and saved posts: blanks only, no tags, no rule results.
import { load } from 'cheerio';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const R = process.argv[2], OUT = process.argv[3];
const require = createRequire(R + '/main-server/package.json');
const { parse } = require('yaml');
const C = R + '/main-server/eval/collection/';
const y = (f) => parse(readFileSync(C + f, 'utf8'));
const clean = (s) => s.replaceAll(' ', ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*\n\s*\n+/g, '\n\n').trim();
function lines($, el) {
  el.find('br').replaceWith('\n');
  el.find('p,div,li,tr,h1,h2,h3,h4,h5,table,ul,ol').before('\n').after('\n');
  return clean(el.text());
}
const posts = {};
function post(file) {
  const id = file.replace(/^posts\/|\.html$/g, '');
  if (posts[id]) return id;
  const $ = load(readFileSync(C + file, 'utf8'));
  $('script,style,noscript').remove();
  if (id.startsWith('snu-')) {
    const v = $('.board-view');
    posts[id] = { src: 'SNU Now', date: clean(v.find('.header .date').first().text()), body: lines($, v.find('.content').first()), images: v.find('.content img').length };
  } else {
    const field = (name) => { let r = ''; $('dt,th').each((_, e) => { if (!r && clean($(e).text()) === name) r = clean($(e).next('dd,td').text()); }); return r; };
    const box = $('.cont_box').filter((_, b) => $(b).find('.cont_tit').text().includes('주요내용')).first();
    box.find('.cont_tit').remove();
    const sessions = []; let cur = null;
    $('table.add_tr tr').each((_, tr) => {
      const h = $(tr).find('th.bg2');
      if (h.length) { cur = { n: /\[(\d+)\]/.exec(h.text())?.[1] ?? '' }; sessions.push(cur); }
      if (!cur) return;
      const k = clean($(tr).find('th').last().text()), val = clean($(tr).find('td').last().text());
      if (k === '강좌명') cur.name = val; else if (k.includes('장소')) cur.place = val; else if (k.includes('기간')) cur.period = val;
    });
    posts[id] = { src: '비교과', apply: field('신청기간'), activity: field('활동기간'), body: lines($, box), images: box.find('img').length, table: sessions };
  }
  return id;
}
const A = (d) => d.items.map((x) => ({ id: x.id, title: x.title, url: x.url, post: post(x.file), rows: x.sessions.length }));
const B = (d) => d.items.map((x) => ({ id: x.id, a: { title: x.a.title, url: x.a.url, post: post(x.a.file), session: x.a.session }, b: { title: x.b.title, url: x.b.url, post: post(x.b.file), session: x.b.session } }));
const places = readFileSync(C + 'labels/places.tsv', 'utf8').trim().split('\n').slice(1).map((l) => l.split('\t')[0]);
const data = { a: { owner: A(y('labels/a.owner.yaml')), second: A(y('labels/a.second.yaml')) }, b: { owner: B(y('labels/b.owner.yaml')), second: B(y('labels/b.second.yaml')) }, posts, places };
writeFileSync(OUT, JSON.stringify(data).replaceAll('<', '\\u003c'));
console.log(Object.keys(posts).length, 'posts', Math.round(JSON.stringify(data).length / 1024), 'KB', data.a.owner.length, data.b.owner.length, data.a.second.length, data.b.second.length);
const s = posts['extra-PGM012002382']; console.log(s.apply, s.activity, s.table.length, s.body.slice(0, 120));
