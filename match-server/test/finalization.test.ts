import {test} from 'node:test';
import assert from 'node:assert/strict';
import {classifyFinalization} from '../src/modules/finalization';

test('definitive validation failures stop the batch while uncertain failures retain it', () => {
  for (const status of [400,404,409]) assert.equal(classifyFinalization(status).terminal,true);
  for (const status of [401,403,429,500,502,503]) assert.equal(classifyFinalization(status).terminal,false);
  assert.match(classifyFinalization(409).explanation,/existing parties/);
  assert.match(classifyFinalization(401).explanation,/operator configuration/);
  assert.match(classifyFinalization(400).explanation,/No party was confirmed/);
});
