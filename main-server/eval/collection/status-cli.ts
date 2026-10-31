/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type Agreement, agreementOnPairs, agreementOnPosts } from './agreement.ts';
import { LABEL_FILES, labelsASchema, labelsBSchema, read } from './sets.ts';

// `pnpm eval:collection:status`: how many blanks each label file still has, and how far the two labellers agree on what
// both have filled in. It reads only the label files and calls no model. See eval/collection/README.md.

function blanks(value: unknown): number {
  if (value === null) {
    return 1;
  }
  if (Array.isArray(value)) {
    return value.reduce((sum: number, item) => sum + blanks(item), 0);
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => key !== 'note' && key !== 'session')
      .reduce((sum, [, item]) => sum + blanks(item), 0);
  }
  return 0;
}

function shown(value: number | null | undefined): string {
  return value === null || value === undefined ? 'n/a' : value.toFixed(3);
}

function line(name: string, agreement: Agreement & { positive?: number | null; negative?: number | null }): string {
  const { n, observed, kappa, positive, negative } = agreement;
  return `| ${name} | ${n} | ${shown(observed)} | ${shown(kappa)} | ${shown(positive)} | ${shown(negative)} |`;
}

const aOwner = read(LABEL_FILES.aOwner, labelsASchema);
const aSecond = read(LABEL_FILES.aSecond, labelsASchema);
const bOwner = read(LABEL_FILES.bOwner, labelsBSchema);
const bSecond = read(LABEL_FILES.bSecond, labelsBSchema);

console.log('Blanks left:');
console.log(`  ${LABEL_FILES.aOwner}: ${blanks(aOwner)}`);
console.log(`  ${LABEL_FILES.aSecond}: ${blanks(aSecond)}`);
console.log(`  ${LABEL_FILES.bOwner}: ${blanks(bOwner)}`);
console.log(`  ${LABEL_FILES.bSecond}: ${blanks(bSecond)}`);

const held = bOwner.items.filter(({ sameEvent }) => sameEvent !== null);
const yes = held.filter(({ sameEvent }) => sameEvent === true).length;
console.log(`\nEvaluation B, the owner's labels so far: ${yes} same event of ${held.length} labelled pairs.`);

console.log('\n| label | n | p_o | κ | positive | negative |\n|---|---|---|---|---|---|');
for (const [field, agreement] of Object.entries(agreementOnPosts(aOwner, aSecond))) {
  console.log(line(`A: ${field}`, agreement));
}
console.log(line('B: sameEvent', agreementOnPairs(bOwner, bSecond)));
