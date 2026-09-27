import { test } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { authenticate, parseHint } from '../src/modules/policy';
const sub = '11111111-1111-4111-8111-111111111111';
test('signed expiring JWT only; no missing config/algorithm bypass', () => {
  const token = jwt.sign({ sub, role: 'student' }, 'test-secret', { expiresIn: 60 });
  assert.equal(authenticate(token, 'test-secret'), sub);
  assert.throws(() => authenticate(token, 'other-secret'));
  assert.throws(() => authenticate(jwt.sign({ sub, role: 'student' }, 'test-secret'), 'test-secret'));
  assert.throws(() => authenticate(jwt.sign({ sub, role: 'student' }, 'test-secret', { algorithm: 'HS384' }), 'test-secret'));
});
test('private types can never broadcast; payload drops all raw data', () => {
  for (const type of ['location.changed', 'quest.changed', 'friend.changed', 'match.changed', 'sharing.changed', 'meetup.changed', 'private-event.changed', 'timetable.changed']) assert.equal(parseHint(JSON.stringify({ id: '1', type, audience: {kind:'public'} })), null);
  const result = parseHint(JSON.stringify({ id:'2', type:'location.changed', latitude:37, audience:{kind:'users',userIds:[sub]}, entityId:sub }));
  assert.deepEqual(result, {rooms:[`user:${sub}`],payload:{id:'2',type:'location.changed',entityId:sub}});
  assert.equal(parseHint(JSON.stringify({ id:'2', type:'event.changed', audience:{kind:'users',userIds:['*']} })), null);
});

test('meetup hint only reaches named participants without plan details', () => {
  const result = parseHint(JSON.stringify({id:'meetup-1', type:'meetup.changed', entityId:sub, version:2, title:'Private plan', startsAt:'2026-09-28', audience:{kind:'users',userIds:[sub,sub]}}));
  assert.deepEqual(result,{rooms:[`user:${sub}`],payload:{id:'meetup-1',type:'meetup.changed',entityId:sub,version:2}});
});

test('private calendar hint contains no event contents or owner list', () => {
 const result = parseHint(JSON.stringify({id:'private-event',type:'private-event.changed',entityId:sub,version:3,title:'Personal plan',audience:{kind:'users',userIds:[sub]}}));
 assert.deepEqual(result,{rooms:[`user:${sub}`],payload:{id:'private-event',type:'private-event.changed',entityId:sub,version:3}});
});

test('timetable hint is stripped to metadata and targets only its owner', () => {
  const other = '22222222-2222-4222-8222-222222222222';
  const hint = {id:'timetable-1',type:'timetable.changed',entityId:sub,version:2,
    title:'Private class',startsAt:'2026-10-01',locationName:'Private classroom',
    timetable:{entries:[{title:'Private class',startMinute:600}]},
    audience:{kind:'users',userIds:[sub,sub]}};
  assert.deepEqual(parseHint(JSON.stringify(hint)),{rooms:[`user:${sub}`],payload:{id:'timetable-1',type:'timetable.changed',entityId:sub,version:2}});
  for (const audience of [{kind:'public'},{kind:'users',userIds:[other]},{kind:'users',userIds:[sub,other]},{kind:'users',userIds:[]}])
    assert.equal(parseHint(JSON.stringify({...hint,audience})),null);
  for (const patch of [{entityId:'not-an-owner-id'},{entityId:undefined},{version:0},{version:undefined}])
    assert.equal(parseHint(JSON.stringify({...hint,...patch})),null);
});
