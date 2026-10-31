/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

// Fills the label files from the labellers' saved answers. Only the answers change; each file's items and order stay.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const [R, FINAL] = process.argv.slice(2);
const require = createRequire(R + '/main-server/package.json');
const YAML = require('yaml');
const C = R + '/main-server/eval/collection/labels/';
const read = (dir) => Object.fromEntries(readdirSync(`${FINAL}/${dir}`).map((f) => { const d = JSON.parse(readFileSync(`${FINAL}/${dir}/${f}`, 'utf8')); return [f.replace('.json', ''), d.data ?? d]; }));
function fill(file, dir, apply) {
  const doc = YAML.parseDocument(readFileSync(C + file, 'utf8'));
  const js = doc.toJS(); const answers = read(dir);
  js.labelledOn = '2026-10-31';
  for (const item of js.items) { const a = answers[item.id]; if (!a) throw new Error(`${file}: no answer for ${item.id}`); apply(item, a); }
  const head = readFileSync(C + file, 'utf8').split('\n').filter((l) => l.startsWith('#')).join('\n');
  writeFileSync(C + file, head + '\n' + YAML.stringify(js, { lineWidth: 0 }));
  console.log(file, js.items.length);
}
const A = (item, a) => { item.announcesEvent = a.announcesEvent; item.sessions = (a.sessions ?? []).map(({ n, start, end, place, overPeriod, mayPublish }) => ({ n, start, end, place, overPeriod, mayPublish })); item.note = a.note ?? null; };
const B = (item, a) => { item.sameEvent = a.sameEvent; item.note = a.note ?? null; };
fill('a.owner.yaml', 'owner-a', A); fill('b.owner.yaml', 'owner-b', B); fill('a.second.yaml', 'second-a', A); fill('b.second.yaml', 'second-b', B);
