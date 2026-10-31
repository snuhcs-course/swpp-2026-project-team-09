/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { chromium } from 'playwright';
import { writeFileSync, existsSync, readFileSync, appendFileSync } from 'node:fs';
const POOL=process.argv[2];
const UA='SNUNow/1.0 (SNU SWPP 2026 team 9; +https://github.com/snuhcs-course/swpp-2026-project-team-09)';
const wait=()=>new Promise(r=>setTimeout(r,2000));
const log=(o)=>appendFileSync(`${POOL}/manifest.jsonl`,JSON.stringify(o)+'\n');
const scrub=(h)=>h.replace(/(OWASP_CSRFTOKEN(?:"\s+(?:content|value)="|=))[0-9a-f-]{36}/g,'$1REMOVED');
const keys=JSON.parse(readFileSync(`${POOL}/extra-closed-list.json`,'utf8')).map(x=>x.key).filter(k=>k>='PGM012002050'&&k<'PGM012002150');
const b=await chromium.launch(); const c=await b.newContext({userAgent:UA,locale:'ko-KR'}); const p=await c.newPage(); let bad=0;
for(const key of keys){ const path=`${POOL}/raw/extra-${key}.html`; if(existsSync(path)) continue;
  const url=`https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=${key}`;
  try{ await p.goto(url,{waitUntil:'networkidle',timeout:60000}); await p.waitForTimeout(500); const final=p.url(); const html=await p.content();
    if(/findIcmpNsbjtPgmInfo/.test(final)){writeFileSync(path,scrub(html)); log({source:'extra',key,url,fetchedAt:new Date().toISOString()}); bad=0;} else {log({source:'extra',key,url,final,skipped:true}); console.log('skip',key);}
  }catch(e){log({source:'extra',key,url,error:e.message}); console.log('err',key); if(++bad>=3){console.log('stopped');break;}}
  await wait(); }
await b.close(); console.log('extra done');
