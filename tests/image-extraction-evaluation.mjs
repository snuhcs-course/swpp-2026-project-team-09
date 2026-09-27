// Opt-in real local-model evaluation; never run as part of unit tests.
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
const fixtureDir=resolve(process.argv[2] || 'artifacts/image-extraction-evaluation');
const workerRoot=resolve(process.env.EXTRACTION_WORKER_ROOT || 'worker-server');
if (!process.env.OLLAMA_BASE_URL) throw new Error('Explicit local OLLAMA_BASE_URL required');
const { ImageExtractionsService }=await import(pathToFileURL(resolve(workerRoot,'dist/modules/image-extractions.js')));
const service=new ImageExtractionsService();
let currentName='';
if(process.env.EXTRACTION_CAPTURE_RESPONSE==='1') {
 const actualFetch=globalThis.fetch;
 globalThis.fetch=async (...args)=>{
  const response=await actualFetch(...args);
  const envelope=await response.clone().text();
  await writeFile(resolve(fixtureDir,currentName+'.model-response.json'),envelope);
  return response;
 };
}
const truth=JSON.parse(await readFile(resolve(fixtureDir,'expected.json'),'utf8'));
const results=[];
const selected=process.argv.slice(3);
for(const [name,expected] of Object.entries(truth)){
 if(selected.length&&!selected.includes(name))continue;
 currentName=name;
 const image=await readFile(resolve(fixtureDir,name));
 const start=Date.now();
 let result,error,checks=[];
 try{
  result=await service.extract({kind:expected.kind,mimeType:name.endsWith('.png')?'image/png':'image/jpeg',imageBase64:image.toString('base64')});
  for(const [field,want] of Object.entries(expected)){
   if(field==='kind')continue;
   let got=result.draft[field];
   let passed;
   if(field==='entries'){
    const normalized=v=>[...v].sort((a,b)=>a.weekday-b.weekday||a.startMinute-b.startMinute).map(({title,weekday,startMinute,endMinute,locationName})=>({title,weekday,startMinute,endMinute,locationName}));
    passed=JSON.stringify(normalized(got))===JSON.stringify(normalized(want));
   }else if((field==='startsAt'||field==='endsAt')&&want!==null)passed=Date.parse(got)===Date.parse(want);
   else passed=got===want;
   checks.push({field,passed,expected:want,actual:got});
  }
 }catch(e){error=e.getResponse?.() || String(e);}
 const row={name,sha256:createHash('sha256').update(image).digest('hex'),elapsedMs:Date.now()-start,result,error,checks};results.push(row);
 await writeFile(resolve(fixtureDir,'results.json'),JSON.stringify({recordedAt:new Date().toISOString(),realModel:true,results},null,2));
 console.log(JSON.stringify({name,elapsedMs:row.elapsedMs,checks:checks.map(({field,passed})=>({field,passed})),error}));
}
