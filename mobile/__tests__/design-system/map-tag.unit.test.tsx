/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { MapDot, MapGroupDot, MapGroupPin, MapPin } from '@/design-system';
import { color, shadow } from '@/design-system/tokens';

// The drawn round or capsule inside the view a screen reader reads.
function drawn(label: string): ReturnType<typeof screen.getByLabelText>['children'][number] {
  return screen.getByLabelText(label).children[0];
}

// P06-61: a 파티 and a 행사 stand out from the map's own icons; a 퀘스트 keeps its light tag.
describe('the markers of a 파티 and a 행사', () => {
  it('draws a 파티 as a navy round of 28 inside a white ring of 2, on the map dot shadow', async () => {
    await render(<MapPin kind="party" />);

    expect(drawn('파티')).toHaveStyle({
      backgroundColor: color.snuBlue,
      borderColor: color.surface,
      borderWidth: 2,
      height: 32,
      minWidth: 32,
      boxShadow: shadow.dot,
    });
  });

  it('draws a 행사 as a white round inside a navy ring, of the same size', async () => {
    await render(<MapPin kind="official" />);

    expect(drawn('공식 행사')).toHaveStyle({
      backgroundColor: color.surface,
      borderColor: color.snuBlue,
      borderWidth: 2,
      height: 32,
      minWidth: 32,
    });
  });

  it.each([
    ['party', '파티'],
    ['official', '공식 행사'],
  ] as const)('draws a %s smaller from far away, 20 inside the ring', async (kind, name) => {
    await render(<MapDot kind={kind} />);

    expect(drawn(name)).toHaveStyle({ height: 24, minWidth: 24 });
  });

  it("writes a 파티's name in white beside its icon", async () => {
    await render(<MapPin count={3} kind="party" label="보드게임" />);

    expect(screen.getByText('보드게임')).toHaveStyle({ color: color.onPrimary });
    expect(screen.getByText('3')).toBeVisible();
  });

  it('keeps a 퀘스트 a see-through light tag', async () => {
    await render(<MapPin kind="quest" />);

    expect(drawn('퀘스트')).toHaveStyle({ opacity: 0.7, borderWidth: 1 });
  });
});

describe('the marker of several kinds at one place', () => {
  it('draws a navy capsule 28 high inside a white ring, whatever kinds are together', async () => {
    await render(<MapGroupPin kinds={['party', 'official', 'quest']} />);

    expect(drawn('파티 · 공식 행사 · 퀘스트')).toHaveStyle({
      backgroundColor: color.snuBlue,
      borderColor: color.surface,
      borderWidth: 2,
      height: 32,
      boxShadow: shadow.dot,
    });
  });

  it('draws the capsule 20 high inside the ring from far away', async () => {
    await render(<MapGroupDot kinds={['party', 'official']} />);

    expect(drawn('파티 · 공식 행사')).toHaveStyle({ height: 24 });
  });

  it("writes the place's name in white after the icons", async () => {
    await render(<MapGroupPin kinds={['party', 'official']} label="학생회관" />);

    expect(screen.getByText('학생회관')).toHaveStyle({ color: color.onPrimary });
  });
});
