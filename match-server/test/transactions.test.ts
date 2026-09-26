import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {Pool} from 'pg';
import Redis from 'ioredis';
import {MatchesService} from '../src/modules/matches';
import {database} from '../src/modules/database';
import {execFileSync} from 'node:child_process';

test('concurrent claims and cancellations cannot consume the same request twice; uncertain finalization stays claimed', {skip:!process.env.TEST_DATABASE_URL||!process.env.TEST_REDIS_URL}, async()=>{
 const namespace=`test_${randomUUID().replaceAll('-','')}`;
 const admin=new Pool({connectionString:process.env.TEST_DATABASE_URL});
 await admin.query(`CREATE SCHEMA ${namespace}`);
 const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL,options:`-c search_path=${namespace}`});
 const redis=new Redis(process.env.TEST_REDIS_URL!,{keyPrefix:`${namespace}:`});
 await new Promise<void>(resolve=>redis.once('ready',resolve));
 const url=new URL(process.env.TEST_DATABASE_URL!);url.searchParams.set("schema",namespace);
 const db=database(url.toString());
 const svc=new MatchesService();svc.db=db;svc.redis=redis;(svc as any).ready=true;
 try {
  execFileSync(process.execPath,[require.resolve("prisma/build/index.js"),"migrate","deploy","--config","prisma.config.ts"],{env:{...process.env,DATABASE_URL:url.toString()}});
  const users=[randomUUID(),randomUUID()],ids=[randomUUID(),randomUUID()];
  for(let i=0;i<2;i++)await pool.query(`INSERT INTO match_requests(id,user_id,status,activity,time_start,time_end,party_size,interests,auto_join_consent,ai_status) VALUES($1,$2,'searching','transaction test',now()+interval '1 hour',now()+interval '2 hours',2,'[]',true,'rules_only')`,[ids[i],users[i]]);
  const claimed=await Promise.all([svc.claimGroup(),svc.claimGroup()]);
  assert.equal(claimed.filter(Boolean).length,1);
  assert.equal((await pool.query('SELECT * FROM match_batches')).rows.length,1);
  assert.equal((await pool.query("SELECT * FROM match_requests WHERE status='finalizing'")).rows.length,2);
  await assert.rejects(svc.cancel(users[0],ids[0]),/finalization/);
  await assert.rejects(pool.query(`INSERT INTO match_requests(id,user_id,status,activity,time_start,time_end,party_size,interests,auto_join_consent,ai_status) VALUES($1,$2,'searching','duplicate',now()+interval '1 hour',now()+interval '2 hours',2,'[]',true,'rules_only')`,[randomUUID(),users[0]]));
  const originalFetch=globalThis.fetch,previousUrl=process.env.MAIN_INTERNAL_URL,previousKey=process.env.INTERNAL_API_KEY;
  process.env.MAIN_INTERNAL_URL='http://test.invalid';process.env.INTERNAL_API_KEY='test-only';
  const calls:any[]=[];
  globalThis.fetch=async(_url,init)=>{calls.push(JSON.parse(init!.body as string));throw new Error('Simulated lost response');};
  try{await svc.finalize(claimed.find(Boolean)!);await db.$disconnect();svc.db=database(url.toString());await svc.finalize(claimed.find(Boolean)!);await svc.db.$disconnect();svc.db=db;}finally{globalThis.fetch=originalFetch;if(previousUrl===undefined)delete process.env.MAIN_INTERNAL_URL;else process.env.MAIN_INTERNAL_URL=previousUrl;if(previousKey===undefined)delete process.env.INTERNAL_API_KEY;else process.env.INTERNAL_API_KEY=previousKey;}
  assert.equal(calls.length,2);assert.equal(calls[0].requestId,calls[1].requestId);assert.deepEqual(calls[0].requestIds,ids);assert.ok(Date.parse(calls[0].timeStart)<Date.parse(calls[0].timeEnd));
  assert.equal((await pool.query("SELECT * FROM match_requests WHERE status='finalizing'")).rows.length,2);
  assert.equal(await svc.claimGroup(),null);
  process.env.MAIN_INTERNAL_URL='http://test.invalid';process.env.INTERNAL_API_KEY='test-only';
  let responseCalls=0;
  globalThis.fetch=async()=>{responseCalls++;return new Response('{}',{status:401});};
  try {
   await svc.finalize(claimed.find(Boolean)!);
   let request=(await pool.query('SELECT * FROM match_requests WHERE id=$1',[ids[0]])).rows[0];
   assert.equal(request.status,'finalizing');assert.match(request.explanation,/operator configuration/);
   globalThis.fetch=async()=>{responseCalls++;return new Response('{}',{status:400});};
   await svc.finalize(claimed.find(Boolean)!);
   request=(await pool.query('SELECT * FROM match_requests WHERE id=$1',[ids[0]])).rows[0];
   assert.equal(request.status,'cancelled');assert.match(request.explanation,/No party was confirmed/);
   assert.ok((await pool.query('SELECT terminal_at FROM match_batches')).rows[0].terminal_at);
   await svc.finalize(claimed.find(Boolean)!);assert.equal(responseCalls,2);
   assert.equal(await svc.claimGroup(),null);
  } finally {globalThis.fetch=originalFetch;if(previousUrl===undefined)delete process.env.MAIN_INTERNAL_URL;else process.env.MAIN_INTERNAL_URL=previousUrl;if(previousKey===undefined)delete process.env.INTERNAL_API_KEY;else process.env.INTERNAL_API_KEY=previousKey;}

  // New requests after terminal cancellation can form a new batch. Concurrent
  // successful retries must call main once and persist the same returned party.
  const newIds=[randomUUID(),randomUUID()];
  for(let i=0;i<2;i++)await db.matchRequest.create({data:{id:newIds[i],user_id:users[i],status:'searching',activity:'success',time_start:new Date(Date.now()+3600000),time_end:new Date(Date.now()+7200000),party_size:2,interests:[],auto_join_consent:true,ai_status:'rules_only'}});
  const successBatch=await svc.claimGroup();assert.ok(successBatch);
  const partyId=randomUUID();let successCalls=0;
  process.env.MAIN_INTERNAL_URL='http://test.invalid';process.env.INTERNAL_API_KEY='test-only';
  globalThis.fetch=async()=>{successCalls++;await new Promise(resolve=>setTimeout(resolve,100));return Response.json({id:partyId});};
  try{
   await Promise.all([svc.finalize(successBatch),svc.finalize(successBatch)]);
   assert.equal(successCalls,1);
   assert.equal(await db.matchRequest.count({where:{id:{in:newIds},status:'matched',party_id:partyId}}),2);
   assert.equal((await svc.list(users[0])).items[0].partyId,partyId);
  }finally{globalThis.fetch=originalFetch;if(previousUrl===undefined)delete process.env.MAIN_INTERNAL_URL;else process.env.MAIN_INTERNAL_URL=previousUrl;if(previousKey===undefined)delete process.env.INTERNAL_API_KEY;else process.env.INTERNAL_API_KEY=previousKey;}

 }finally{
  await redis.del('match:candidates');redis.disconnect();await db.$disconnect();await pool.end();await admin.query(`DROP SCHEMA ${namespace} CASCADE`);await admin.end();
 }
});
