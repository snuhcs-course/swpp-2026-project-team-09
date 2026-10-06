import type { ReactElement } from 'react';

import { formatInSeoul, isMidnightInSeoul } from '@/seoul-time';

export const POSSIBLY_WITHOUT_TIME =
  'A collected start at 00:00 is often a day read without its time. Check the time in the source.';

export function StartTime({ startsAt }: { startsAt: string }): ReactElement {
  return (
    <>
      {formatInSeoul(startsAt)}
      {isMidnightInSeoul(startsAt) && (
        <span title={POSSIBLY_WITHOUT_TIME} className="text-amber-700">
          {' · time possibly missing'}
        </span>
      )}
    </>
  );
}
