import { Injectable, OnModuleInit, OnModuleDestroy, ServiceUnavailableException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Pool } from 'pg';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { schema } from './schema';
import { Candidate, selectGroup, validateRequest, UUID } from './rules';
import { embeddingFor } from './embeddings';
import { classifyFinalization } from './finalization';
const INDEX='match:candidates';
@Injectable()
export class MatchesService implements OnModuleInit,OnModuleDestroy {
  pool?:Pool; redis?:Redis; private ready=false; private timer?:NodeJS.Timeout; private running=false;
  async onModuleInit() {
    if(process.env.REDIS_CACHE_URL){this.redis=new Redis(process.env.REDIS_CACHE_URL,{maxRetriesPerRequest:1});this.redis.on('error',()=>{});}
    if(process.env.DATABASE_URL){this.pool=new Pool({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:3000});this.pool.on('error',()=>{this.ready=false;});}
    await this.initialize();
    this.timer=setInterval(()=>void this.tick().catch(()=>{}),10000);
  }
  private async initialize(){if(!this.ready&&this.pool){try{await this.pool.query(schema);this.ready=true;}catch{this.ready=false;}}}
  async health(){try{await this.pool?.query('SELECT 1');}catch{this.ready=false;}return {service:'match-server',status:this.ready&&this.redis?.status==='ready'&&process.env.JWT_SECRET&&process.env.MAIN_INTERNAL_URL&&process.env.INTERNAL_API_KEY?'ok':'configuration_required_or_unavailable'};}
  private requireDb(){if(!this.ready||!this.pool)throw new ServiceUnavailableException('Matching database configuration required or unavailable');return this.pool;}
  private dto(r:any){return {id:r.id,status:r.status,activity:r.activity,timeStart:r.time_start.toISOString(),timeEnd:r.time_end.toISOString(),partySize:r.party_size,eventId:r.event_id,partyId:r.party_id,createdAt:r.created_at.toISOString(),explanation:r.explanation||undefined,aiStatus:r.ai_status};}
  async list(userId:string){const rows=await this.requireDb().query('SELECT * FROM match_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100',[userId]);return {items:rows.rows.map(r=>this.dto(r))};}
  async create(userId:string,body:unknown){
    const input=validateRequest(body);const pool=this.requireDb();
    if(!process.env.MAIN_INTERNAL_URL||!process.env.INTERNAL_API_KEY)throw new ServiceUnavailableException('Main integration configuration required');
    const ai=await embeddingFor(`${input.activity}\n${input.interests.join(', ')}`,this.redis);
    const id=randomUUID();
    try {
      const result=await pool.query(`INSERT INTO match_requests(id,user_id,status,activity,event_id,time_start,time_end,party_size,interests,auto_join_consent,embedding,ai_status,explanation) VALUES($1,$2,'searching',$3,$4,$5,$6,$7,$8,true,$9,$10,$11) RETURNING *`,[id,userId,input.activity,input.eventId,input.timeStart,input.timeEnd,input.partySize,JSON.stringify(input.interests),ai.embedding?JSON.stringify(ai.embedding):null,ai.aiStatus,'Waiting for consenting students with matching activity, event, size and overlapping availability.']);
      await this.redis?.zadd(INDEX,+input.timeEnd,id).catch(()=>{});
      void this.tick().catch(()=>{});
      return this.dto(result.rows[0]);
    }catch(error:any){if(error.code==='23505')throw new ConflictException('An active matching request already exists');throw error;}
  }
  async cancel(userId:string,id:string){
    if(!UUID.test(id))throw new BadRequestException('Invalid request ID');
    const pool=this.requireDb(),client=await pool.connect();
    try{await client.query('BEGIN');const result=await client.query('SELECT * FROM match_requests WHERE id=$1 AND user_id=$2 FOR UPDATE',[id,userId]);const row=result.rows[0];
      if(!row)throw new NotFoundException('Match request not found');
      if(row.status==='finalizing'||row.status==='matched')throw new ConflictException('Party finalization has already started');
      if(row.status==='searching'){await client.query("UPDATE match_requests SET status='cancelled',explanation='Cancelled before finalization.' WHERE id=$1",[id]);row.status='cancelled';row.explanation='Cancelled before finalization.';}
      await client.query('COMMIT');await this.redis?.zrem(INDEX,id).catch(()=>{});await this.hint(userId,id);return this.dto(row);
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
  // Only this transaction can assign a request to a batch. External calls happen after COMMIT.
  async claimGroup():Promise<string|null>{
    const pool=this.requireDb();
    if(!this.redis||this.redis.status!=='ready')return null;
    const live=await pool.query("SELECT id,time_end FROM match_requests WHERE status='searching' AND time_end>now() ORDER BY created_at LIMIT 500");
    if(live.rows.length){const pipeline=this.redis.pipeline();for(const row of live.rows)pipeline.zadd(INDEX,+row.time_end,row.id);await pipeline.exec();}
    await this.redis.zremrangebyscore(INDEX,'-inf',Date.now());
    const ids=await this.redis.zrange(INDEX,0,499);if(!ids.length)return null;
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      // Transaction-scoped lock serializes batch formation across replicas, not external network work.
      await client.query('SELECT pg_advisory_xact_lock(419460914)');
      await client.query("UPDATE match_requests SET status='expired',explanation='Availability ended before a full group formed.' WHERE status='searching' AND time_end<=now()");
      const result=await client.query("SELECT * FROM match_requests WHERE id=ANY($1::uuid[]) AND status='searching' AND time_end>now() ORDER BY created_at FOR UPDATE",[ids]);
      const group=selectGroup(result.rows as Candidate[]);
      if(!group){await client.query('COMMIT');return null;}
      const batchId=randomUUID(),requestIds=group.map(r=>r.id),userIds=group.map(r=>r.user_id),seed=group[0];
      await client.query('INSERT INTO match_batches(id,request_ids,user_ids,title,event_id,party_size,time_start,time_end) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[batchId,requestIds,userIds,seed.activity,seed.event_id,seed.party_size,new Date(Math.max(...group.map(r=>+r.time_start))),new Date(Math.min(...group.map(r=>+r.time_end)))]);
      await client.query("UPDATE match_requests SET status='finalizing',batch_id=$1,explanation='Consented group claimed; confirming party with main server.' WHERE id=ANY($2::uuid[])",[batchId,requestIds]);
      await client.query('COMMIT');
      await this.redis.zrem(INDEX,...requestIds).catch(()=>{});
      return batchId;
    }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
  }
  async finalize(batchId: string) {
    const pool = this.requireDb();
    if (!process.env.MAIN_INTERNAL_URL || !process.env.INTERNAL_API_KEY) return;
    const client = await pool.connect();
    let locked = false;
    try {
      // A bounded network call holds a session lock, preventing conflicting outcomes
      // from simultaneous retries by different matcher replicas.
      const lock = await client.query('SELECT pg_try_advisory_lock(hashtextextended($1, 0)) AS acquired', [batchId]);
      locked = lock.rows[0].acquired;
      if (!locked) return;
      const result = await client.query('SELECT * FROM match_batches WHERE id=$1 AND party_id IS NULL AND terminal_at IS NULL', [batchId]);
      const batch = result.rows[0];
      if (!batch) return;
      await client.query('UPDATE match_batches SET last_attempt_at=now() WHERE id=$1', [batchId]);
      try {
        if (!batch.time_start || !batch.time_end) throw new Error('Batch availability requires operator repair; original batch retained');
        const response = await fetch(`${process.env.MAIN_INTERNAL_URL}/v1/internal/parties/match`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-key': process.env.INTERNAL_API_KEY },
          body: JSON.stringify({ requestId: batch.id, requestIds: batch.request_ids, userIds: batch.user_ids,
            title: batch.title, eventId: batch.event_id, maxMembers: batch.party_size,
            timeStart: batch.time_start.toISOString(), timeEnd: batch.time_end.toISOString() }),
          signal: AbortSignal.timeout(10000),
        });
        if (!response.ok) {
          const outcome = classifyFinalization(response.status);
          await client.query('BEGIN');
          try {
            await client.query('UPDATE match_batches SET last_error=$2,terminal_at=CASE WHEN $3 THEN now() ELSE NULL END WHERE id=$1', [batch.id, outcome.explanation, outcome.terminal]);
            await client.query("UPDATE match_requests SET status=CASE WHEN $3 THEN 'cancelled' ELSE 'finalizing' END,explanation=$2 WHERE batch_id=$1 AND status='finalizing'", [batch.id, outcome.explanation, outcome.terminal]);
            await client.query('COMMIT');
          } catch (error) { await client.query('ROLLBACK'); throw error; }
        } else {
          const party = await response.json() as any;
          if (!party || typeof party.id !== 'string' || !UUID.test(party.id)) throw new Error('Main finalization response invalid; original batch retained');
          await client.query('BEGIN');
          try {
            await client.query('UPDATE match_batches SET party_id=$2,last_error=NULL WHERE id=$1', [batch.id, party.id]);
            await client.query("UPDATE match_requests SET status='matched',party_id=$2,explanation='Matched by activity, event, group size, common availability and interests.' WHERE batch_id=$1 AND status='finalizing'", [batch.id, party.id]);
            await client.query('COMMIT');
          } catch (error) { await client.query('ROLLBACK'); throw error; }
        }
        for (let i = 0; i < batch.user_ids.length; i++) await this.hint(batch.user_ids[i], batch.request_ids[i]);
      } catch (error) {
        const explanation = 'Party confirmation is uncertain or temporarily unavailable. The original group is retained for idempotent retry; no party is confirmed yet.';
        await client.query('BEGIN');
        try {
          await client.query('UPDATE match_batches SET last_error=$2 WHERE id=$1', [batch.id, error instanceof Error ? error.message : explanation]);
          await client.query("UPDATE match_requests SET explanation=$2 WHERE batch_id=$1 AND status='finalizing'", [batch.id, explanation]);
          await client.query('COMMIT');
        } catch (failure) { await client.query('ROLLBACK'); throw failure; }
      }
    } finally {
      let discardConnection = false;
      if (locked) {
        try { await client.query('SELECT pg_advisory_unlock(hashtextextended($1, 0))', [batchId]); }
        catch { discardConnection = true; }
      }
      client.release(discardConnection);
    }
  }
  private async hint(userId:string,id:string){await this.redis?.publish('prototype:domain-events',JSON.stringify({id:randomUUID(),type:'match.changed',entityId:id,audience:{kind:'users',userIds:[userId]}})).catch(()=>{});}
  async tick(){
    if(this.running)return;this.running=true;
    try{await this.initialize();if(!this.ready)return;
      await this.pool!.query("UPDATE match_requests SET status='expired',explanation='Availability ended before a full group formed.' WHERE status='searching' AND time_end<=now()");
      const pending=await this.pool!.query('SELECT id FROM match_batches WHERE party_id IS NULL AND terminal_at IS NULL AND (last_attempt_at IS NULL OR last_attempt_at<now()-interval \'30 seconds\') ORDER BY created_at LIMIT 10');
      for(const row of pending.rows)await this.finalize(row.id);
      const id=await this.claimGroup();if(id)await this.finalize(id);
    }finally{this.running=false;}
  }
  async onModuleDestroy(){if(this.timer)clearInterval(this.timer);this.redis?.disconnect();await this.pool?.end();}
}
