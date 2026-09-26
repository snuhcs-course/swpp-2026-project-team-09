import {createHash} from 'node:crypto';
import Redis from 'ioredis';
export async function embeddingFor(content:string,redis?:Redis):Promise<{embedding:number[]|null;aiStatus:string}> {
 if(!process.env.OPENAI_API_KEY)return {embedding:null,aiStatus:'rules_only: AI configuration required'};
 const model=process.env.EMBEDDING_MODEL||'text-embedding-3-small';
 const key=`match:embedding:${createHash('sha256').update(`${model}\n${content}`).digest('hex')}`;
 try {
  const cached=await redis?.get(key);if(cached)return {embedding:JSON.parse(cached),aiStatus:`embedding:${model}`};
  const result=await fetch('https://api.openai.com/v1/embeddings',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model,input:content}),signal:AbortSignal.timeout(8000)});
  if(!result.ok)throw new Error('Embedding provider unavailable');
  const body=await result.json() as any;const embedding=body.data?.[0]?.embedding;
  if(!Array.isArray(embedding)||!embedding.length||embedding.length>10000||!embedding.every((v:unknown)=>typeof v==='number'&&Number.isFinite(v)))throw new Error('Invalid embedding');
  await redis?.set(key,JSON.stringify(embedding),'EX',604800);
  return {embedding,aiStatus:`embedding:${model}`};
 }catch{return {embedding:null,aiStatus:'rules_only: embedding provider unavailable'};}
}
