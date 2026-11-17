/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { timedBlocks } from '@/features/timetable-ocr/read-timetable';

import everytime1 from '../../main-server/eval/timetable-reading/blocks/everytime-1.json';
import everytime2 from '../../main-server/eval/timetable-reading/blocks/everytime-2.json';
import everytimeDark1 from '../../main-server/eval/timetable-reading/blocks/everytime-dark-1.json';
import snutt1 from '../../main-server/eval/timetable-reading/blocks/snutt-1.json';
import snutt2 from '../../main-server/eval/timetable-reading/blocks/snutt-2.json';
import snutt3 from '../../main-server/eval/timetable-reading/blocks/snutt-3.json';
import snutt4 from '../../main-server/eval/timetable-reading/blocks/snutt-4.json';
import snuttDark1 from '../../main-server/eval/timetable-reading/blocks/snutt-dark-1.json';
import snuttGrey1 from '../../main-server/eval/timetable-reading/blocks/snutt-grey-1.json';

import { ocrOutput, SCREENSHOTS } from './support/timetable-ocr';
import { gridOnly, NEW_SCREENSHOTS } from './support/timetable-ocr-new';

// P15-52: the blocks the phone sends with a screenshot to the main server's reader (`timedBlocks`) are those the
// server's experiment and its tests read (`main-server/eval/timetable-reading/blocks/<name>.json`). On P13's four from
// their saved ML Kit outputs; on the five new ones from the PNG with the day and hour labels stood in.

const SAVED: Record<string, unknown> = {
  'everytime-1': everytime1,
  'snutt-1': snutt1,
  'snutt-2': snutt2,
  'snutt-3': snutt3,
  'everytime-2': everytime2,
  'everytime-dark-1': everytimeDark1,
  'snutt-4': snutt4,
  'snutt-dark-1': snuttDark1,
  'snutt-grey-1': snuttGrey1,
};

function saved(name: string): unknown {
  return SAVED[name];
}

it.each(SCREENSHOTS)('sends the saved blocks of %s', (name) => {
  expect(timedBlocks(ocrOutput(name))).toEqual(saved(name));
});

it.each(NEW_SCREENSHOTS)('sends the saved blocks of %s', (name) => {
  expect(timedBlocks(gridOnly(name))).toEqual(saved(name));
});
