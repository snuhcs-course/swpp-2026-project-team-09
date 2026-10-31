/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type Agreement, agreementOnPairs, agreementOnPosts, type YesNoAgreement } from './agreement.ts';
import { LABEL_FILES, labelsASchema, labelsBSchema, readCollectionFile } from './sets.ts';

// `pnpm eval:collection:status`: how many blanks each label file still has, and how far the two labellers agree on what
// both have filled in. It reads only the label files and calls no model. The P05 owner runs it; a labeller still labelling
// should not, since it shows the other's answers in numbers. See eval/collection/README.md.

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

function line(name: string, agreement: Agreement | YesNoAgreement): string {
  const { n, observed, kappa } = agreement;
  const apart = 'positive' in agreement ? `${shown(agreement.positive)} | ${shown(agreement.negative)}` : '— | —';
  return `| ${name} | ${n} | ${shown(observed)} | ${shown(kappa)} | ${apart} |`;
}

function main(): number {
  const aOwner = readCollectionFile(LABEL_FILES.aOwner, labelsASchema);
  const aSecond = readCollectionFile(LABEL_FILES.aSecond, labelsASchema);
  const bOwner = readCollectionFile(LABEL_FILES.bOwner, labelsBSchema);
  const bSecond = readCollectionFile(LABEL_FILES.bSecond, labelsBSchema);

  console.log('Blanks left:');
  for (const [file, labels] of [
    [LABEL_FILES.aOwner, aOwner],
    [LABEL_FILES.aSecond, aSecond],
    [LABEL_FILES.bOwner, bOwner],
    [LABEL_FILES.bSecond, bSecond],
  ] as const) {
    console.log(`  ${file}: ${blanks(labels)}`);
  }

  const labelled = bOwner.items.filter(({ sameEvent }) => sameEvent !== null);
  const same = labelled.filter(({ sameEvent }) => sameEvent === true).length;
  console.log(`\nEvaluation B, the owner's labels so far: ${same} same event of ${labelled.length} labelled pairs.`);

  console.log('\n| label | n | p_o | κ | positive | negative |\n|---|---|---|---|---|---|');
  const posts = agreementOnPosts(aOwner, aSecond);
  for (const field of ['announcesEvent', 'start', 'end', 'place', 'overPeriod', 'mayPublish'] as const) {
    console.log(line(`A: ${field}`, posts[field]));
  }
  console.log(line('B: sameEvent', agreementOnPairs(bOwner, bSecond)));
  return 0;
}

process.exitCode = main();
