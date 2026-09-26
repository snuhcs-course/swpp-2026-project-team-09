import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseMeals,parseVehicles,parseStops,parseEvent,validDate} from '../src/modules/parsers';
const fixture=(file:string)=>readFileSync(`test/fixtures/${file}`,'utf8');
test('actual source meal date and blank breakfast are preserved',()=>{
 const items=parseMeals(fixture('meals-2026-09-27.html'),'2026-09-27');
 assert.ok(items.length>0);assert.equal(items[0].breakfast,'');assert.match(items[0].lunch,/휴무/);
 assert.throws(()=>parseMeals(fixture('meals-2026-09-27.html'),'2026-09-28'));
 assert.throws(()=>parseMeals('<html></html>','2026-09-27'));
 assert.equal(validDate('2026-02-30'),false);
});
test('actual empty vehicle response; malformed rows fail rather than manufacture vehicles',()=>{
 assert.deepEqual(parseVehicles(JSON.parse(fixture('shuttle-empty.json'))),[]);
 assert.throws(()=>parseVehicles({d:'vehicle/no/20/1/label/code'}));
 assert.throws(()=>parseVehicles({d:'vehicle//20/1/label/code'}));
 const stops=parseStops(fixture('shuttle-41946.html'));assert.ok(stops.some(s=>s.name==='정문'&&s.x===157&&s.y===35));
});
test('only explicit actual event interval is imported',()=>{
 const item=parseEvent(fixture('event-176192.html'),'https://www.snu.ac.kr/snunow/events?md=v&bbsidx=176192');
 assert.ok(item);assert.equal(item.startsAt,'2026-09-29T09:30:00.000Z');assert.equal(item.endsAt,'2026-09-29T10:30:00.000Z');
 assert.equal(parseEvent(fixture('event-176192.html').replace('18:30-19:30','18:30'),'https://www.snu.ac.kr/snunow/events?bbsidx=176192'),null);
});
