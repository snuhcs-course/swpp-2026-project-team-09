/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { chromium } from 'playwright';
import { writeFileSync, existsSync, readFileSync, appendFileSync } from 'node:fs';
import { load } from 'cheerio';
const POOL=process.argv[2]; const SNU_FROM=Number(process.argv[3]);
const UA='SNUNow/1.0 (SNU SWPP 2026 team 9; +https://github.com/snuhcs-course/swpp-2026-project-team-09)';
const wait=()=>new Promise(r=>setTimeout(r,2000));
const log=(o)=>{appendFileSync(`${POOL}/manifest.jsonl`,JSON.stringify(o)+'\n')};
const scrub=(h)=>h.replace(/(OWASP_CSRFTOKEN(?:"\s+(?:content|value)="|=))[0-9a-f-]{36}/g,'$1REMOVED');
const b=await chromium.launch(); const c=await b.newContext({userAgent:UA,locale:'ko-KR'}); const p=await c.newPage();
const extra=new Map();
for(let page=1;page<=40;page++){
  await p.goto(`https://extra.snu.ac.kr/ptfol/pgm/index.do?currentPageNo=${page}`,{waitUntil:'networkidle',timeout:60000});
  const html=await p.content(); writeFileSync(`${POOL}/lists/extra-${page}.html`,scrub(html));
  const $=load(html); const items=$('a.tit.ellipsis').toArray().map(a=>({key:/'(PGM\d+)'/.exec($(a).attr('onclick')||'')?.[1],title:$(a).text().trim(),status:$(a).closest('.desc_wrap').find('.label_box a span').first().text().trim(),kind:$(a).closest('.desc_wrap').find('.major_type li').toArray().map(l=>$(l).text()).join('/')})).filter(x=>x.key);
  console.log('extra page',page,items.length); await wait();
  if(!items.length||items.every(i=>extra.has(i.key))) break; for(const i of items) extra.set(i.key,i);
}
writeFileSync(`${POOL}/extra-list.json`,JSON.stringify([...extra.values()],null,1));
for(const {key} of extra.values()){
  const path=`${POOL}/raw/extra-${key}.html`; if(existsSync(path)) continue;
  const url=`https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=${key}`;
  try{
    await p.goto(url,{waitUntil:'networkidle',timeout:60000}); await p.waitForTimeout(500);
    const final=p.url(); const html=await p.content();
    if(!/findIcmpNsbjtPgmInfo/.test(final)){ log({source:'extra',key,url,final,skipped:true,fetchedAt:new Date().toISOString()}); console.log('skip',key,final); }
    else { writeFileSync(path,scrub(html)); log({source:'extra',key,url,final:final.replace(/&?OWASP_CSRFTOKEN=[^&]+/,''),fetchedAt:new Date().toISOString()}); console.log('ok',key); }
  }catch(e){ log({source:'extra',key,url,error:e.message}); console.log('err',key,e.message);}
  await wait();
}
await b.close();
const snu=JSON.parse(readFileSync(`${POOL}/snu-list.json`,'utf8')).filter(x=>Number(x.key)>=SNU_FROM);
console.log('snu to fetch',snu.length);
for(const {key} of snu){
  const path=`${POOL}/raw/snu-${key}.html`; if(existsSync(path)) continue;
  const url=`https://www.snu.ac.kr/snunow/events?md=v&bbsidx=${key}`;
  try{ const r=await fetch(url,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(15000)}); const html=await r.text(); if(!r.ok||/snucert\.snu\.ac\.kr\/waf/.test(html)){log({source:'snu',key,url,error:`status ${r.status} or blocked`});console.log('blocked',key,r.status);break;} writeFileSync(path,html); log({source:'snu',key,url,fetchedAt:new Date().toISOString()}); }catch(e){log({source:'snu',key,url,error:e.message});console.log('err',key,e.message);}
  await wait();
}
console.log('done');
