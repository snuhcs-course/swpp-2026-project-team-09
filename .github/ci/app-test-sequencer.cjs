/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

// The app's Jest test sequencer in CI (`--testSequencer`, from ci.yml's mobile-tests): it packs the test files into
// the shards by their seconds in app-test-times.json, longest first into the shard with the least so far, and runs a
// shard's files longest first. After a run it prints each file's seconds, from which app-test-times.sh rebuilds the
// table. It stays out of mobile/package.json, whose change could change the app's fingerprint.

const path = require('node:path');
const times = require('./app-test-times.json');

// A file missing from the table, such as a new one, counts as a typical file of its level.
function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length === 0 ? 1 : sorted[Math.floor(sorted.length / 2)];
}
const known = Object.entries(times);
const INTEGRATION = median(known.filter(([file]) => file.includes('.integration.')).map(([, seconds]) => seconds));
const UNIT = median(known.filter(([file]) => !file.includes('.integration.')).map(([, seconds]) => seconds));

function key(test) {
  return path.relative(test.context.config.rootDir, test.path).split(path.sep).join('/');
}

function seconds(test) {
  const file = key(test);
  if (Object.hasOwn(times, file)) {
    return times[file];
  }
  return file.includes('.integration.') ? INTEGRATION : UNIT;
}

function longestFirst(a, b) {
  return seconds(b) - seconds(a) || (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0);
}

module.exports = class AppTestSequencer {
  shard(tests, { shardIndex, shardCount }) {
    const totals = new Array(shardCount).fill(0);
    const mine = [];
    for (const test of [...tests].sort(longestFirst)) {
      const shard = totals.indexOf(Math.min(...totals));
      totals[shard] += seconds(test);
      if (shard === shardIndex - 1) {
        mine.push(test);
      }
    }
    process.stderr.write(
      `Shard ${shardIndex}/${shardCount}: ${mine.length} of ${tests.length} test files, ` +
        `${Math.round(totals[shardIndex - 1])} s of ${Math.round(totals.reduce((a, b) => a + b, 0))} s by the table\n`,
    );
    return mine;
  }

  sort(tests) {
    return [...tests].sort(longestFirst);
  }

  allFailedTests(tests) {
    return tests;
  }

  cacheResults(tests, results) {
    const rootDir = tests.length > 0 ? tests[0].context.config.rootDir : process.cwd();
    for (const result of results.testResults) {
      const file = path.relative(rootDir, result.testFilePath).split(path.sep).join('/');
      const runtime = (result.perfStats.end - result.perfStats.start) / 1000;
      process.stdout.write(`app-test-time ${runtime.toFixed(1)} ${file}\n`);
    }
  }
};
