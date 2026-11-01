/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { writeFileSync, existsSync, readFileSync, appendFileSync } from 'node:fs';
const POOL=process.argv[2];
const UA='SNUNow/1.0 (SNU SWPP 2026 team 9; +https://github.com/snuhcs-course/swpp-2026-project-team-09)';
const wait=()=>new Promise(r=>setTimeout(r,2000));
const log=(o)=>appendFileSync(`${POOL}/manifest.jsonl`,JSON.stringify(o)+'\n');
const snu=JSON.parse(readFileSync(`${POOL}/snu-list.json`,'utf8')).filter(x=>Number(x.key)>=176900&&Number(x.key)<177300);
for(const {key} of snu){ const path=`${POOL}/raw/snu-${key}.html`; if(existsSync(path)) continue;
  const url=`https://www.snu.ac.kr/snunow/events?md=v&bbsidx=${key}`;
  const r=await fetch(url,{headers:{'User-Agent':UA},signal:AbortSignal.timeout(15000)}); const html=await r.text();
  if(!r.ok||/snucert\.snu\.ac\.kr\/waf/.test(html)){console.log('stopped',key,r.status);process.exit(1);} writeFileSync(path,html); log({source:'snu',key,url,fetchedAt:new Date().toISOString()}); await wait(); }
console.log('snu done');
