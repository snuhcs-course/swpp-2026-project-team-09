import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTimetableAvailability as availability, overlaps } from '../src/modules/availability';
const d=(s:string)=>new Date(s);
const e=(weekday:number,startMinute:number,endMinute:number)=>({weekday,startMinute,endMinute,title:'Private class',locationName:'Private room'});
const t=(entries:ReturnType<typeof e>[] = [])=>({timezone:'Asia/Seoul',semesterStartsOn:'2026-09-07',semesterEndsOn:'2026-09-13',entries});
const iso=(xs:Array<{startsAt:Date;endsAt:Date}>)=>xs.map(x=>[x.startsAt.toISOString(),x.endsAt.toISOString()]);
test('Seoul weekdays, UTC rollover, inclusive semester and 24:00 ending',()=>{
 const r=availability(t([e(1,0,60),e(7,1380,1440)]),d('2026-09-06T14:00Z'),d('2026-09-13T16:00Z'));
 assert.deepEqual(iso(r.coverage),[['2026-09-06T15:00:00.000Z','2026-09-13T15:00:00.000Z']]);
 assert.deepEqual(iso(r.busy),[['2026-09-06T15:00:00.000Z','2026-09-06T16:00:00.000Z'],['2026-09-13T14:00:00.000Z','2026-09-13T15:00:00.000Z']]);
 assert.deepEqual(iso(r.free),[['2026-09-06T16:00:00.000Z','2026-09-13T14:00:00.000Z']]);
 assert.equal(JSON.stringify(r).includes('Private'),false);
});
test('adjacent/overlapping busy intervals merge, clip to requested window, without input mutation',()=>{
 const input=t([e(1,600,660),e(1,540,600),e(1,630,690),e(1,720,780)]),before=structuredClone(input);
 const r=availability(input,d('2026-09-07T00:30Z'),d('2026-09-07T03:30Z'));
 assert.deepEqual(iso(r.busy),[['2026-09-07T00:30:00.000Z','2026-09-07T02:30:00.000Z'],['2026-09-07T03:00:00.000Z','2026-09-07T03:30:00.000Z']]);
 assert.deepEqual(iso(r.free),[['2026-09-07T02:30:00.000Z','2026-09-07T03:00:00.000Z']]);assert.deepEqual(input,before);
});
test('half-open boundaries and millisecond precision',()=>{
 const input=t([e(1,540,600)]),a={startsAt:d('2026-09-07T00:00Z'),endsAt:d('2026-09-07T01:00Z')};
 assert.equal(overlaps(a,{startsAt:a.endsAt,endsAt:d('2026-09-07T02:00Z')}),false);
 assert.equal(overlaps(a,{startsAt:d('2026-09-07T00:59:59.999Z'),endsAt:d('2026-09-07T02:00Z')}),true);
 assert.equal(availability(input,d('2026-09-06T23:00Z'),a.startsAt).busy.length,0);
 const r=availability(input,d('2026-09-07T01:00:00.001Z'),d('2026-09-07T02:00Z'));
 assert.deepEqual(r.busy,[]);assert.deepEqual(iso(r.free),[['2026-09-07T01:00:00.001Z','2026-09-07T02:00:00.000Z']]);
 assert.throws(()=>overlaps(a,{startsAt:a.endsAt,endsAt:a.startsAt}),RangeError);
});
test('missing semester, empty configured calendar and out-of-term coverage remain distinct',()=>{
 const from=d('2026-09-06T14:00Z'),to=d('2026-09-06T16:00Z');
 for(const missing of [null,undefined,{...t(),semesterStartsOn:null,semesterEndsOn:null}])assert.deepEqual(availability(missing,from,to),{configured:false,coverage:[],busy:[],free:[]});
 const r=availability(t(),from,to);assert.equal(r.configured,true);assert.deepEqual(iso(r.free),[['2026-09-06T15:00:00.000Z','2026-09-06T16:00:00.000Z']]);
 assert.deepEqual(availability(t(),d('2026-09-13T15:00Z'),d('2026-09-13T16:00Z')),{configured:true,coverage:[],busy:[],free:[]});
});
test('inclusive one-day semester and 24:00 end cross year boundary',()=>{
 const input={...t([e(4,0,1440)]),semesterStartsOn:'2026-12-31',semesterEndsOn:'2026-12-31'};
 const r=availability(input,d('2026-12-30T14:00Z'),d('2027-01-01T00:00Z'));
 assert.deepEqual(iso(r.busy),[['2026-12-30T15:00:00.000Z','2026-12-31T15:00:00.000Z']]);assert.deepEqual(r.free,[]);
});
test('invalid dates/entries/semesters fail; horizon and count bounded',()=>{
 const from=d('2026-09-01T00:00Z'),to=d('2026-09-02T00:00Z');
 assert.doesNotThrow(()=>availability(t(),from,new Date(+from+31*86400000)));
 for(const [a,b]of [[to,from],[from,from],[new Date(NaN),to],[from,new Date(+from+31*86400000+1)]])assert.throws(()=>availability(null,a,b),RangeError);
 for(const patch of [{timezone:'UTC'},{semesterStartsOn:'2026-02-30'},{semesterStartsOn:null},{semesterEndsOn:'2026-09-01'},{semesterStartsOn:'0000-01-01'},{entries:Array.from({length:101},()=>e(1,1,2))},{entries:[e(0,1,2)]},{entries:[e(8,1,2)]},{entries:[e(1,0.5,2)]},{entries:[e(1,0,1441)]},{entries:[e(1,1,1)]},{entries:[null]},{semesterStartsOn:null,semesterEndsOn:null,entries:[e(1,1,2)]}])assert.throws(()=>availability({...t(),...patch},from,to),RangeError);
 assert.throws(()=>availability('invalid',from,to),TypeError);
});
