import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Candidate,selectGroup,compatible,validateRequest} from '../src/modules/rules';
const c=(id:string,start:number,end:number,extra:Partial<Candidate>={}):Candidate=>({id,user_id:id,activity:'점심',event_id:null,time_start:new Date(start),time_end:new Date(end),party_size:3,interests:[],embedding:null,...extra});
test('pairwise overlaps without whole-group overlap cannot form group',()=>{assert.equal(selectGroup([c('a',0,10),c('b',5,15),c('c',10,20)]),null);});
test('exact size, event, activity, unique users and whole-group interval',()=>{
 const a=c('a',0,10),b=c('b',5,15),third=c('c',6,20);
 assert.equal(selectGroup([a,b,third])?.length,3);
 assert.equal(selectGroup([a,b]),null);
 for(const extra of [{party_size:2},{event_id:'other'},{activity:'저녁'},{user_id:'a'}])assert.equal(compatible([a],c('b',0,10,extra)),false);
});
test('explicit consent and sensible future inputs required',()=>{
 const input={activity:'점심',timeStart:new Date(Date.now()+60000).toISOString(),timeEnd:new Date(Date.now()+120000).toISOString(),partySize:2,interests:[],autoJoinConsent:true};
 assert.equal(validateRequest(input).partySize,2);
 assert.throws(()=>validateRequest({...input,autoJoinConsent:false}));assert.throws(()=>validateRequest({...input,partySize:7}));assert.throws(()=>validateRequest({...input,timeEnd:input.timeStart}));
});
