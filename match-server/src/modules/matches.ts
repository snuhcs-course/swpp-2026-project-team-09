import { Injectable, OnModuleInit, OnModuleDestroy, ServiceUnavailableException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, PrismaClient } from '../generated/prisma/client';
import { database, deployMigrations } from './database';
import Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { Candidate, selectGroup, validateRequest, UUID } from './rules';
import { embeddingFor } from './embeddings';
import { classifyFinalization } from './finalization';
const INDEX='match:candidates';
@Injectable()
export class MatchesService implements OnModuleInit,OnModuleDestroy {
  db?:PrismaClient; redis?:Redis; private ready=false; private migrated=false; private timer?:NodeJS.Timeout; private running=false;
  async onModuleInit() {
    if(process.env.REDIS_CACHE_URL){this.redis=new Redis(process.env.REDIS_CACHE_URL,{maxRetriesPerRequest:1});this.redis.on('error',()=>{});}
    if(process.env.DATABASE_URL){this.db=database(process.env.DATABASE_URL);}
    await this.initialize();
    this.timer=setInterval(()=>void this.tick().catch(()=>{}),10000);
  }
  private async initialize(){if(!this.ready&&this.db){try{if(!this.migrated){await deployMigrations();this.migrated=true;}await this.db.matchRequest.count();await this.db.matchBatch.count();this.ready=true;}catch{this.ready=false;}}}
  async health(){try{if(this.db)await this.db.$queryRaw`SELECT 1`;}catch{this.ready=false;}return {service:'match-server',status:this.ready&&this.redis?.status==='ready'&&process.env.JWT_SECRET&&process.env.MAIN_INTERNAL_URL&&process.env.INTERNAL_API_KEY?'ok':'configuration_required_or_unavailable'};}
  private requireDb(){if(!this.ready||!this.db)throw new ServiceUnavailableException('Matching database configuration required or unavailable');return this.db;}
  private dto(r:any){return {id:r.id,status:r.status,activity:r.activity,timeStart:r.time_start.toISOString(),timeEnd:r.time_end.toISOString(),partySize:r.party_size,eventId:r.event_id,partyId:r.party_id,createdAt:r.created_at.toISOString(),explanation:r.explanation||undefined,aiStatus:r.ai_status};}
  async list(userId:string){const rows=await this.requireDb().matchRequest.findMany({where:{user_id:userId},orderBy:{created_at:'desc'},take:100});return {items:rows.map(r=>this.dto(r))};}
  async create(userId:string,body:unknown){
    const input=validateRequest(body);const db=this.requireDb();
    if(!process.env.MAIN_INTERNAL_URL||!process.env.INTERNAL_API_KEY)throw new ServiceUnavailableException('Main integration configuration required');
    const ai=await embeddingFor(`${input.activity}\n${input.interests.join(', ')}`,this.redis);
    const id=randomUUID();
    try {
      const result=await db.matchRequest.create({data:{id,user_id:userId,status:'searching',activity:input.activity,event_id:input.eventId,time_start:input.timeStart,time_end:input.timeEnd,party_size:input.partySize,interests:input.interests,auto_join_consent:true,embedding:ai.embedding ?? Prisma.DbNull,ai_status:ai.aiStatus,explanation:'Waiting for consenting students with matching activity, event, size and overlapping availability.'}});
      await this.redis?.zadd(INDEX,+input.timeEnd,id).catch(()=>{});
      void this.tick().catch(()=>{});
      return this.dto(result);
    }catch(error:any){if(error.code==='P2002')throw new ConflictException('An active matching request already exists');throw error;}
  }
  async cancel(userId:string,id:string){
    if(!UUID.test(id))throw new BadRequestException('Invalid request ID');
    const row=await this.requireDb().$transaction(async tx=>{
      const rows=await tx.$queryRaw<any[]>`SELECT * FROM match_requests WHERE id=${id}::uuid AND user_id=${userId}::uuid FOR UPDATE`;
      const row=rows[0];
      if(!row)throw new NotFoundException('Match request not found');
      if(row.status==='finalizing'||row.status==='matched')throw new ConflictException('Party finalization has already started');
      return row.status==='searching'?tx.matchRequest.update({where:{id},data:{status:'cancelled',explanation:'Cancelled before finalization.'}}):row;
    });
    await this.redis?.zrem(INDEX,id).catch(()=>{});await this.hint(userId,id);return this.dto(row);
  }
  // Only this transaction assigns requests to a batch; main is contacted after commit.
  async claimGroup():Promise<string|null>{
    const db=this.requireDb();
    if(!this.redis||this.redis.status!=='ready')return null;
    const live=await db.matchRequest.findMany({where:{status:'searching',time_end:{gt:new Date()}},orderBy:{created_at:'asc'},take:500,select:{id:true,time_end:true}});
    if(live.length){const pipeline=this.redis.pipeline();for(const row of live)pipeline.zadd(INDEX,+row.time_end,row.id);await pipeline.exec();}
    await this.redis.zremrangebyscore(INDEX,'-inf',Date.now());
    const ids=await this.redis.zrange(INDEX,0,499);if(!ids.length)return null;
    const claimed=await db.$transaction(async tx=>{
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(419460914)::text`;
      await tx.matchRequest.updateMany({where:{status:'searching',time_end:{lte:new Date()}},data:{status:'expired',explanation:'Availability ended before a full group formed.'}});
      const rows=await tx.$queryRaw<Candidate[]>`SELECT * FROM match_requests WHERE id IN (${Prisma.join(ids.map(id=>Prisma.sql`${id}::uuid`))}) AND status='searching' AND time_end>now() ORDER BY created_at FOR UPDATE`;
      const group=selectGroup(rows);if(!group)return null;
      const batchId=randomUUID(),requestIds=group.map(r=>r.id),userIds=group.map(r=>r.user_id),seed=group[0];
      await tx.matchBatch.create({data:{id:batchId,request_ids:requestIds,user_ids:userIds,title:seed.activity,event_id:seed.event_id,party_size:seed.party_size,time_start:new Date(Math.max(...group.map(r=>+r.time_start))),time_end:new Date(Math.min(...group.map(r=>+r.time_end)))}});
      await tx.matchRequest.updateMany({where:{id:{in:requestIds}},data:{status:'finalizing',batch_id:batchId,explanation:'Consented group claimed; confirming party with main server.'}});
      return {batchId,requestIds};
    });
    if(!claimed)return null;
    await this.redis.zrem(INDEX,...claimed.requestIds).catch(()=>{});
    return claimed.batchId;
  }
  async finalize(batchId: string) {
    const db=this.requireDb();
    if(!process.env.MAIN_INTERNAL_URL||!process.env.INTERNAL_API_KEY)return;
    const completed=await db.$transaction(async tx=>{
      // Transaction lock is released even on timeout/disconnect. Its bounded HTTP call
      // prevents two replicas from committing conflicting outcomes for the same batch.
      const lock=await tx.$queryRaw<{acquired:boolean}[]>`SELECT pg_try_advisory_xact_lock(hashtextextended(${batchId},0)) AS acquired`;
      if(!lock[0].acquired)return null;
      const batch=await tx.matchBatch.findFirst({where:{id:batchId,party_id:null,terminal_at:null}});
      if(!batch)return null;
      await tx.matchBatch.update({where:{id:batchId},data:{last_attempt_at:new Date()}});
      let partyId:string|undefined;
      let outcome:ReturnType<typeof classifyFinalization>|undefined;
      let failure:string|undefined;
      try {
        if(!batch.time_start||!batch.time_end)throw new Error('Batch availability requires operator repair; original batch retained');
        const response=await fetch(`${process.env.MAIN_INTERNAL_URL}/v1/internal/parties/match`,{
          method:'POST',headers:{'Content-Type':'application/json','x-internal-key':process.env.INTERNAL_API_KEY!},
          body:JSON.stringify({requestId:batch.id,requestIds:batch.request_ids,userIds:batch.user_ids,title:batch.title,eventId:batch.event_id,maxMembers:batch.party_size,timeStart:batch.time_start.toISOString(),timeEnd:batch.time_end.toISOString()}),signal:AbortSignal.timeout(10000),
        });
        if(!response.ok)outcome=classifyFinalization(response.status);
        else {
          const party=await response.json() as any;
          if(!party||typeof party.id!=='string'||!UUID.test(party.id))throw new Error('Main finalization response invalid; original batch retained');
          partyId=party.id;
        }
      }catch(error){failure=error instanceof Error?error.message:'Party confirmation unavailable';}
      if(partyId){
        await tx.matchBatch.update({where:{id:batchId},data:{party_id:partyId,last_error:null}});
        await tx.matchRequest.updateMany({where:{batch_id:batchId,status:'finalizing'},data:{status:'matched',party_id:partyId,explanation:'Matched by activity, event, group size, common availability and interests.'}});
      }else if(outcome){
        await tx.matchBatch.update({where:{id:batchId},data:{last_error:outcome.explanation,terminal_at:outcome.terminal?new Date():null}});
        await tx.matchRequest.updateMany({where:{batch_id:batchId,status:'finalizing'},data:{status:outcome.terminal?'cancelled':'finalizing',explanation:outcome.explanation}});
      }else{
        await tx.matchBatch.update({where:{id:batchId},data:{last_error:failure}});
        await tx.matchRequest.updateMany({where:{batch_id:batchId,status:'finalizing'},data:{explanation:'Party confirmation is uncertain or temporarily unavailable. The original group is retained for idempotent retry; no party is confirmed yet.'}});
      }
      return batch;
    },{timeout:20000,maxWait:5000});
    if(completed)for(let i=0;i<completed.user_ids.length;i++)await this.hint(completed.user_ids[i],completed.request_ids[i]);
  }
  private async hint(userId:string,id:string){await this.redis?.publish('prototype:domain-events',JSON.stringify({id:randomUUID(),type:'match.changed',entityId:id,audience:{kind:'users',userIds:[userId]}})).catch(()=>{});}
  async tick(){
    if(this.running)return;this.running=true;
    try{await this.initialize();if(!this.ready)return;
      await this.db!.matchRequest.updateMany({where:{status:'searching',time_end:{lte:new Date()}},data:{status:'expired',explanation:'Availability ended before a full group formed.'}});
      const pending=await this.db!.matchBatch.findMany({where:{party_id:null,terminal_at:null,OR:[{last_attempt_at:null},{last_attempt_at:{lt:new Date(Date.now()-30000)}}]},orderBy:{created_at:'asc'},take:10,select:{id:true}});
      for(const row of pending)await this.finalize(row.id);
      const id=await this.claimGroup();if(id)await this.finalize(id);
    }finally{this.running=false;}
  }
  async onModuleDestroy(){if(this.timer)clearInterval(this.timer);this.redis?.disconnect();await this.db?.$disconnect();}
}
