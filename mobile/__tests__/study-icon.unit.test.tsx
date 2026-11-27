/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';
import type { ReactElement } from 'react';
import { color, Icon, MapAnswerMark } from '@/design-system';
import { AskedExamples } from '@/screens/main/answer/asked-examples';

// One study icon everywhere (P01 ticket 10, the user's words on 2026-11-27): the open book the 공부공간 layer draws
// (`bookOpen`), in the "공부할 자리" chip and in the 관정 booking's round on the map.
// Partitions: the chip and the round. Expected values: the layer's icon, drawn at the same colour and size.

async function drawn(element: ReactElement): Promise<string> {
  await render(element);
  return JSON.stringify(screen.toJSON());
}

describe('the study icon', () => {
  it('is the layer\'s open book in the "공부할 자리" chip', async () => {
    const open = await drawn(<Icon color={color.svcStudy} name="bookOpen" size={16} />);

    expect(await drawn(<AskedExamples bottom={0} onSend={(): void => undefined} />)).toContain(open);
  });

  it("is the layer's open book in the 관정 booking's round", async () => {
    const open = await drawn(<Icon color={color.onPrimary} name="bookOpen" size={16} />);
    const round = <MapAnswerMark label={null} symbol={{ type: 'dot', role: 'pick', number: null, study: true }} />;

    expect(await drawn(round)).toContain(open);
  });
});
