import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {Pool} from 'pg';
import {schema} from './fixtures/legacy-schema';

test('verified legacy baseline preserves data, checks and active-request uniqueness', {skip:!process.env.TEST_DATABASE_URL}, async()=>{
 const namespace=`baseline_${randomUUID().replaceAll('-','')}`;
 const admin=new Pool({connectionString:process.env.TEST_DATABASE_URL});
 await admin.query(`CREATE SCHEMA ${namespace}`);
 const pool=new Pool({connectionString:process.env.TEST_DATABASE_URL,options:`-c search_path=${namespace}`});
 const url=new URL(process.env.TEST_DATABASE_URL!);url.searchParams.set('schema',namespace);
 const cli=(...args:string[])=>spawnSync(process.execPath,[require.resolve('prisma/build/index.js'),'migrate',...args,'--config','prisma.config.ts'],{env:{...process.env,DATABASE_URL:url.toString()},encoding:'utf8'});
 try {
  // Exact startup SQL from the last pre-Prisma service revision.
  await pool.query(schema);
  const id=randomUUID(),userId=randomUUID(),batchId=randomUUID();
  await pool.query(`INSERT INTO match_requests(id,user_id,status,activity,time_start,time_end,party_size,interests,auto_join_consent,ai_status,batch_id) VALUES($1,$2,'finalizing','legacy fixture',now()+interval '1 hour',now()+interval '2 hours',2,'["walking"]',true,'rules_only',$3)`,[id,userId,batchId]);
  await pool.query(`INSERT INTO match_batches(id,request_ids,user_ids,title,party_size,time_start,time_end,last_error) SELECT $1,ARRAY[id],ARRAY[user_id],activity,party_size,time_start,time_end,'uncertain legacy response' FROM match_requests WHERE id=$2`,[batchId,id]);
  const before={requests:(await pool.query('SELECT * FROM match_requests')).rows,batches:(await pool.query('SELECT * FROM match_batches')).rows};
  const rejected=cli('deploy');assert.notEqual(rejected.status,0);assert.match(rejected.stdout+rejected.stderr,/P3005/);
  const resolved=cli('resolve','--applied','0001_baseline');assert.equal(resolved.status,0,resolved.stdout+resolved.stderr);
  const deployed=cli('deploy');assert.equal(deployed.status,0,deployed.stdout+deployed.stderr);
  assert.deepEqual({requests:(await pool.query('SELECT * FROM match_requests')).rows,batches:(await pool.query('SELECT * FROM match_batches')).rows},before);
  for(const mutation of ["auto_join_consent=false","party_size=7","status='unknown'","time_end=time_start"]){
   await assert.rejects(pool.query(`UPDATE match_requests SET ${mutation} WHERE id=$1`,[id]),(error:any)=>error.code==='23514');
  }
  await assert.rejects(pool.query(`INSERT INTO match_requests SELECT $1,user_id,status,activity,event_id,time_start,time_end,party_size,interests,auto_join_consent,consented_at,embedding,ai_status,batch_id,party_id,explanation,created_at FROM match_requests WHERE id=$2`,[randomUUID(),id]),(error:any)=>error.code==='23505');
  assert.equal((await pool.query("SELECT count(*)::int AS count FROM _prisma_migrations WHERE migration_name='0001_baseline' AND finished_at IS NOT NULL")).rows[0].count,1);
 }finally{await pool.end();await admin.query(`DROP SCHEMA ${namespace} CASCADE`);await admin.end();}
});
