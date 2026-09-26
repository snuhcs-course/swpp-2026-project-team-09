// Opt in: node tests/event-cache-measurement.mjs --run [--output /path/report.json]
// Requires Docker and a built main-server with its existing dependencies installed.
// EVENT_CACHE_APP_ROOT optionally selects that checkout. Never reads local .env files.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { spawn, execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile, access } from 'node:fs/promises';
import os from 'node:os';

if (!process.argv.includes('--run')) {
  console.log('Opt-in only. Build main-server, then run: node tests/event-cache-measurement.mjs --run');
  process.exit(0);
}
const root=resolve(process.env.EVENT_CACHE_APP_ROOT || resolve(dirname(fileURLToPath(import.meta.url)),'..'));
await access(resolve(root,'main-server/dist/main.js'));
const require=createRequire(resolve(root,'main-server/package.json'));
const {Pool}=require('pg'), Redis=require('ioredis'), jwt=require('jsonwebtoken');
const run=randomBytes(8).toString('hex'), password=randomBytes(24).toString('hex'), secret=randomBytes(32).toString('hex');
const containers=[], children=[];
let pool, redis, cleaning;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const docker=(...args)=>execFileSync('docker',args,{encoding:'utf8',timeout:120000,stdio:['ignore','pipe','pipe']}).trim();
async function cleanup(){
  if(cleaning)return cleaning;
  cleaning=(async()=>{
    for(const child of children){child.kill('SIGTERM');await Promise.race([new Promise(r=>child.once('exit',r)),sleep(3000)]);if(child.exitCode===null)child.kill('SIGKILL');}
    redis?.disconnect();await pool?.end();
    for(const name of containers.reverse()){try{docker('rm','-f',name);}catch{console.error(`Cleanup requires: docker rm -f ${name}`);}}
  })();return cleaning;
}
for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>void cleanup().then(()=>process.exit(130)));
async function until(fn,label){for(let i=0;i<240;i++){try{if(await fn())return;}catch{}await sleep(250);}throw Error(`Timed out: ${label}`);}
async function port(){const server=createServer();await new Promise((r,j)=>server.once('error',j).listen(0,'127.0.0.1',r));const p=server.address().port;await new Promise(r=>server.close(r));return p;}
function startContainer(kind,image,args){const name=`event-cache-${kind}-${run}`;containers.push(name);docker('run','-d','--name',name,...args,image,...(kind==='pg'?['postgres','-c','shared_preload_libraries=pg_stat_statements','-c','pg_stat_statements.track=all']:[]));return name;}
function mappedPort(name,internal){return Number(docker('port',name,String(internal)).split(':').at(-1));}
async function statements(){return (await pool.query('SELECT queryid::text,query,calls::int FROM pg_stat_statements WHERE dbid=(SELECT oid FROM pg_database WHERE datname=current_database())')).rows;}
function queryDelta(before,after){
  const old=new Map(before.map(r=>[r.queryid,r.calls]));
  const classify=query=>/^SELECT\b/i.test(query)&&/FROM\s+"?public"?\."?events"?(?:\s|$)/i.test(query)?'eventList':/^SELECT\b/i.test(query)&&/FROM\s+"?public"?\."?users"?(?:\s|$)/i.test(query)?'authentication':/^SELECT\b/i.test(query)&&/FROM\s+"?public"?\."?event_revision"?(?:\s|$)/i.test(query)?'eventRevision':null;
  const counts={eventList:0,authentication:0,eventRevision:0}, normalized=[];
  for(const row of after){const category=classify(row.query),calls=row.calls-(old.get(row.queryid)||0);if(category&&calls){counts[category]+=calls;normalized.push({category,calls,query:row.query});}}
  return {counts,normalized};
}
async function redisStats(){const info=await redis.info('stats');return Object.fromEntries(['keyspace_hits','keyspace_misses'].map(k=>[k,Number(info.match(new RegExp(`^${k}:(\\d+)`,'m'))[1])]));}
const percentile=(values,q)=>[...values].sort((a,b)=>a-b)[Math.ceil(values.length*q)-1];
try {
  const pgImage='postgis/postgis:17-3.5',redisImage='redis:8-alpine';
  const pg=startContainer('pg',pgImage,['-e',`POSTGRES_PASSWORD=${password}`,'-e','POSTGRES_DB=cache_measurement','-p','127.0.0.1::5432']);
  const cache=startContainer('redis',redisImage,['-p','127.0.0.1::6379']);
  const pgPort=mappedPort(pg,5432),redisPort=mappedPort(cache,6379);
  const databaseUrl=`postgresql://postgres:${password}@127.0.0.1:${pgPort}/cache_measurement`;
  pool=new Pool({connectionString:databaseUrl,connectionTimeoutMillis:1000});
  await until(()=>pool.query('SELECT 1'),'disposable PostgreSQL');
  await pool.query('CREATE EXTENSION pg_stat_statements'); // Fail explicitly if real instrumentation is unavailable.
  redis=new Redis(`redis://127.0.0.1:${redisPort}`,{maxRetriesPerRequest:1});redis.on('error',()=>{});
  await until(()=>redis.ping(),'disposable Redis');
  const urls={};
  for(const role of ['public','admin']){
    const p=await port();urls[role]=`http://127.0.0.1:${p}`;
    const child=spawn(process.execPath,['dist/main.js'],{cwd:resolve(root,'main-server'),env:{PATH:process.env.PATH,HOME:process.env.HOME,TMPDIR:process.env.TMPDIR,NODE_ENV:'test',PORT:String(p),APP_ROLE:role,DATABASE_URL:databaseUrl,REDIS_CACHE_URL:`redis://127.0.0.1:${redisPort}`,JWT_SECRET:secret},stdio:'ignore'});
    children.push(child);await until(async()=>{if(child.exitCode!==null)throw Error('Main process exited');return (await fetch(`${urls[role]}/health`,{signal:AbortSignal.timeout(1000)})).ok;},`main ${role}`);
  }
  const userId=randomUUID();
  await pool.query("INSERT INTO users(id,google_sub,email,display_name) VALUES($1,$2,$3,'TEST ONLY cache measurement student')",[userId,`TESTONLY-${run}`,`testonly-${run}@example.invalid`]);
  // Explicit synthetic fixtures, never presented as integrated external event data.
  for(let i=0;i<20;i++)await pool.query("INSERT INTO events(id,title,description,starts_at,ends_at,location_name,status,source) VALUES($1,$2,'SYNTHETIC TEST ONLY: not a real event',$3,$4,'TEST ONLY location','published','manual')",[randomUUID(),`SYNTHETIC TEST ONLY event ${i}`,new Date(Date.UTC(2030,0,1+i,0)),new Date(Date.UTC(2030,0,1+i,1))]);
  const token=jwt.sign({role:'student'},secret,{subject:userId,expiresIn:'15m',algorithm:'HS256'});
  let expected;
  async function request(){const began=performance.now();const response=await fetch(`${urls.public}/v1/events`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(5000)});assert.equal(response.status,200);const body=await response.json();const elapsed=performance.now()-began;assert.equal(body.items.length,20);const serialized=JSON.stringify(body);if(expected===undefined)expected=serialized;else assert.equal(serialized,expected,'Cached and uncached event content must match');return elapsed;}
  await request(); // Establish HTTP/auth connections before the comparison.
  async function phase(cold){
    // Every Redis key in this container is owned by this run; evict only this cache key.
    if(!cold)await request();
    const before=await statements(),rBefore=await redisStats(),latencies=[];
    for(let i=0;i<50;i++){if(cold)await redis.del('prototype:events');latencies.push(await request());}
    const rAfter=await redisStats(),after=await statements();
    return {requests:50,...queryDelta(before,after),redis:{hits:rAfter.keyspace_hits-rBefore.keyspace_hits,misses:rAfter.keyspace_misses-rBefore.keyspace_misses},latencyMs:{p50:percentile(latencies,.5),p95:percentile(latencies,.95)}};
  }
  const cold=await phase(true),warm=await phase(false);
  assert.equal(cold.counts.eventList,50,'Instrumentation must identify all cold event-list SELECTs');assert.equal(warm.counts.eventList,0);
  assert.equal(cold.counts.authentication,50);assert.equal(warm.counts.authentication,50);
  assert.equal(warm.redis.hits,50);assert.equal(warm.redis.misses,0);
  const report={measuredAt:new Date().toISOString(),appCommit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),environment:{host:`${os.platform()} ${os.arch()}`,node:process.version,postgres:(await pool.query('SHOW server_version')).rows[0].server_version,postgis:(await pool.query('SELECT postgis_lib_version() AS version')).rows[0].version,redis:(await redis.info('server')).match(/^redis_version:(.+)$/m)[1].trim(),pgImage,redisImage},fixtureEvents:20,concurrency:1,cold,warm,eventListSelectReductionPercent:100,equivalentResponses:true,limitations:['Forced eviction before each cold request is an intentional worst case.','Single local sequential sample; latency percentiles are descriptive, not production capacity or a general speedup benchmark.','Authentication still performs one users SELECT per request.','Synthetic fixtures only; no external feed or real identity integration was exercised.','Background outbox queries and transaction overhead are excluded; event-list, revision, and auth SELECTs are counted separately.']};
  const outputIndex=process.argv.indexOf('--output');if(outputIndex!==-1){assert.ok(process.argv[outputIndex+1]);await writeFile(resolve(process.argv[outputIndex+1]),JSON.stringify(report,null,2)+'\n');}
  console.log(JSON.stringify(report,null,2));
}finally{await cleanup();}
