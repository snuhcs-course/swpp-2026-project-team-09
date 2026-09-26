import { BadRequestException } from '@nestjs/common';
export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export interface Candidate {id:string;user_id:string;activity:string;event_id:string|null;time_start:Date;time_end:Date;party_size:number;interests:string[];embedding:number[]|null;}
export function validateRequest(x: any) {
  if (!x || x.autoJoinConsent !== true) throw new BadRequestException('Explicit autoJoinConsent is required');
  if (typeof x.activity !== 'string' || !x.activity.trim() || x.activity.length>120) throw new BadRequestException('activity must contain 1–120 characters');
  if (!Number.isInteger(x.partySize) || x.partySize<2 || x.partySize>6) throw new BadRequestException('partySize must be 2–6');
  if (x.eventId != null && (typeof x.eventId !== 'string' || !UUID.test(x.eventId))) throw new BadRequestException('Invalid eventId');
  if (!Array.isArray(x.interests) || x.interests.length>10 || !x.interests.every((v:unknown)=>typeof v==='string'&&v.trim().length>0&&v.length<=80)) throw new BadRequestException('Invalid interests');
  if (typeof x.timeStart !== 'string' || typeof x.timeEnd !== 'string' || !/T.*(?:Z|[+-]\d\d:\d\d)$/.test(x.timeStart) || !/T.*(?:Z|[+-]\d\d:\d\d)$/.test(x.timeEnd)) throw new BadRequestException('Time requires ISO 8601 timezone');
  const start = new Date(x.timeStart),end=new Date(x.timeEnd);
  if (!Number.isFinite(+start)||!Number.isFinite(+end)||+start<=Date.now()||+end<=+start||+end-+start>7*86400000||+start>Date.now()+90*86400000) throw new BadRequestException('Invalid future availability interval');
  return {activity:x.activity.trim(),eventId:x.eventId||null,partySize:x.partySize,interests:[...new Set<string>(x.interests.map((v:string)=>v.trim()))],timeStart:start,timeEnd:end};
}
export function compatible(group: Candidate[], next: Candidate) {
  const seed=group[0];
  return next.party_size===seed.party_size && next.event_id===seed.event_id && next.activity.normalize('NFKC').toLowerCase()===seed.activity.normalize('NFKC').toLowerCase() && !group.some(c=>c.user_id===next.user_id) && Math.max(...group.map(c=>+c.time_start),+next.time_start)<Math.min(...group.map(c=>+c.time_end),+next.time_end);
}
export function similarity(a:Candidate,b:Candidate) {
  let score=a.interests.filter(v=>b.interests.includes(v)).length/Math.max(1,new Set([...a.interests,...b.interests]).size);
  if(a.embedding&&b.embedding&&a.embedding.length===b.embedding.length) {
    const norm=Math.sqrt(a.embedding.reduce((v,n)=>v+n*n,0)*b.embedding.reduce((v,n)=>v+n*n,0));
    if(norm)score+=Math.max(0,a.embedding.reduce((v,n,i)=>v+n*b.embedding![i],0)/norm);
  }
  return score;
}
export function selectGroup(candidates: Candidate[]): Candidate[]|null {
  for(const seed of candidates) {
    const group=[seed];
    const others=candidates.filter(c=>c.id!==seed.id).sort((a,b)=>similarity(seed,b)-similarity(seed,a));
    for(const next of others) {if(compatible(group,next))group.push(next);if(group.length===seed.party_size)return group;}
  }
  return null;
}
