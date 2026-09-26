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
  for (const type of ['location.changed', 'quest.changed', 'friend.changed', 'match.changed', 'sharing.changed', 'meetup.changed', 'private-event.changed']) assert.equal(parseHint(JSON.stringify({ id: '1', type, audience: {kind:'public'} })), null);
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
