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
const b=await chromium.launch(); const c=await b.newContext({userAgent:UA,locale:'ko-KR'}); const p=await c.newPage();
const out=new Map();
for(let page=1;page<=25;page++){
  await p.goto(`https://extra.snu.ac.kr/ptfol/pgm/index.do?currentPageNo=${page}&applyChkCdSh=0003`,{waitUntil:'networkidle',timeout:60000});
  const html=await p.content(); const $=load(html);
  const items=$('a.tit.ellipsis').toArray().map(a=>({key:/'(PGM\d+)'/.exec($(a).attr('onclick')||'')?.[1],title:$(a).text().trim(),status:$(a).closest('.desc_wrap').find('.label_box a span').first().text().trim()})).filter(x=>x.key);
  const last=$('a:contains("마지막으로")').attr('onclick');
  console.log(page,items.length,items[0]?.status,items[0]?.key,last); await wait();
  if(!items.length||items.every(i=>out.has(i.key))) break; for(const i of items) out.set(i.key,i);
}
writeFileSync(`${POOL}/extra-closed-list.json`,JSON.stringify([...out.values()],null,1)); await b.close();
