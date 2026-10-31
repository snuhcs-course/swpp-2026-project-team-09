/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
import { load } from 'cheerio';
const POOL=process.argv[2];
const UA='SNUNow/1.0 (SNU SWPP 2026 team 9; +https://github.com/snuhcs-course/swpp-2026-project-team-09)';
const wait=()=>new Promise(r=>setTimeout(r,2000));
const headers={'User-Agent':UA};
// SNU Now: from 90 days back to a year ahead, so that the window holds posts about events already over.
const snu=[]; 
for(let page=1;page<=60;page++){
  const url=`https://www.snu.ac.kr/snunow/events?sc=y&df=2026.08.01&dt=2027.10.31&page=${page}`;
  const html=await (await fetch(url,{headers})).text(); writeFileSync(`${POOL}/lists/snu-${page}.html`,html);
  const $=load(html); const items=$('.event-board .board-imgline a.item').toArray().map(a=>({key:/bbsidx=(\d+)/.exec($(a).attr('href'))?.[1],title:$(a).find('.title').text().trim(),date:$(a).find('.date').text().trim()}));
  console.log('snu page',page,items.length); if(!items.length) break; snu.push(...items); await wait();
}
writeFileSync(`${POOL}/snu-list.json`,JSON.stringify(snu,null,1));
const b=await chromium.launch(); const c=await b.newContext({userAgent:UA,locale:'ko-KR'}); const p=await c.newPage();
const extra=[];
for(let page=1;page<=40;page++){
  await p.goto(`https://extra.snu.ac.kr/ptfol/pgm/index.do?currentPageNo=${page}`,{waitUntil:'networkidle',timeout:60000});
  const html=await p.content(); writeFileSync(`${POOL}/lists/extra-${page}.html`,html.replace(/[0-9a-f-]{36}/g,'CSRF'));
  const $=load(html); const items=$('a.tit').toArray().map(a=>({key:/'(PGM\d+)'/.exec($(a).attr('onclick')||'')?.[1],title:$(a).text().trim(),status:$(a).closest('.desc_wrap').find('.label_box a span').first().text().trim(),kind:$(a).closest('.desc_wrap').find('.major_type li').toArray().map(l=>$(l).text()).join('/')}));
  console.log('extra page',page,items.length,items[0]?.key); if(!items.length|| extra.some(e=>e.key===items[0].key)) break; extra.push(...items); await wait();
}
writeFileSync(`${POOL}/extra-list.json`,JSON.stringify(extra,null,1));
await b.close();
console.log('snu',snu.length,'extra',extra.length);
