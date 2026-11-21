/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { TimeBand } from '@/api/assistant-types';
import { bandEdgesOf } from '@/features/assistant/time-band';

const at = (clock: string): string => `2026-11-18T${clock}:00+09:00`;
const stretch = (start: string, end: string, label?: string): TimeBand['lanes'][number]['busy'][number] => ({
  startAt: at(start),
  endAt: at(end),
  ...(label === undefined ? {} : { label }),
});

// A meeting tomorrow at 14:00–15:00: my class ends at 13:45, 민수's next one starts at 15:30.
const BAND: TimeBand = {
  range: { startAt: at('13:00'), endAt: at('16:00') },
  now: '2026-11-17T11:50:00+09:00',
  lanes: [
    { userId: 'me', name: '나', busy: [stretch('12:30', '13:45', '수업'), stretch('16:00', '17:15', '수업')] },
    { userId: 'minsu', name: '민수', busy: [stretch('15:30', '16:45', '수업')] },
  ],
  startAt: at('14:00'),
  endAt: at('15:00'),
  text: '14:00–15:00 · 함께 60분',
};

describe('bandEdgesOf', () => {
  it('names the busy stretch that ends last before the span and the one that starts first after it', () => {
    expect(bandEdgesOf(BAND)).toEqual({ before: '13:45 수업 끝', after: '민수 15:30 수업' });
  });

  it('says the range ends without a busy stretch on that side', () => {
    const free = { ...BAND, lanes: [{ userId: 'me', name: '나', busy: [] }] };
    expect(bandEdgesOf(free)).toEqual({ before: '13:00', after: '16:00' });
  });

  it('says 지금 when now is in the range before the span and no busy stretch ends later', () => {
    const today = { ...BAND, now: at('13:50'), lanes: [{ userId: 'me', name: '나', busy: [] }] };
    expect(bandEdgesOf(today).before).toBe('13:50 지금');
  });

  it('calls a busy stretch without a label 일정', () => {
    const plain = { ...BAND, lanes: [{ userId: 'me', name: '나', busy: [stretch('12:30', '13:45')] }] };
    expect(bandEdgesOf(plain).before).toBe('13:45 일정 끝');
  });
});
