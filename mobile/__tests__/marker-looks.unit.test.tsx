/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';
import type { MarkerLook } from '@/map';
import { LookView, lookName } from '@/map/marker-looks';

const SEO_YEON: MarkerLook = {
  kind: 'person',
  id: 'f2',
  tone: 'free',
  name: '이서연',
  photo: 'https://a.test/1.jpg?sig=1',
};

describe("a person's look on the map", () => {
  it('is named by the person and not by the address of the photo, which is new with every answer', () => {
    expect(lookName(SEO_YEON)).toBe('person:full:free:f2:photo');
    expect(lookName({ ...SEO_YEON, photo: 'https://a.test/1.jpg?sig=2' })).toBe(lookName(SEO_YEON));
    expect(lookName({ ...SEO_YEON, name: '이 서연' })).toBe(lookName(SEO_YEON));
  });

  it('has another name for each tone, size and person, selected or not, with a photo or without', () => {
    const names = [
      SEO_YEON,
      { ...SEO_YEON, photo: null },
      { ...SEO_YEON, small: true },
      { ...SEO_YEON, selected: true },
      { ...SEO_YEON, tone: 'class' as const },
      { ...SEO_YEON, id: 'f3' },
    ].map((look) => lookName(look));

    expect(names).toEqual([
      'person:full:free:f2:photo',
      'person:full:free:f2',
      'person:small:free:f2:photo',
      'person:full:free:f2:photo:selected',
      'person:full:class:f2:photo',
      'person:full:free:f3:photo',
    ]);
  });

  it('has another name with the "+" of a Friend who can be added to the answer on screen', () => {
    expect(lookName({ ...SEO_YEON, addable: true })).toBe('person:full:free:f2:photo:addable');
    expect(lookName({ ...SEO_YEON, addable: false })).toBe(lookName(SEO_YEON));
  });
});

// Partitions: a Friend at the exact level and one not, alone and with "selected" or the "+" after it. Expected values:
// P02 ticket 20, a look for the green dot of its own, and one name for two looks that draw one picture; the ends
// "selected" and "addable" stay last, as the answer's faces read them.
describe("a person's look at the exact level", () => {
  it('has a name of its own, and the name of a face without the dot when `exact` is false', () => {
    expect(lookName({ ...SEO_YEON, exact: true })).toBe('person:full:free:f2:photo:exact');
    expect(lookName({ ...SEO_YEON, exact: false })).toBe(lookName(SEO_YEON));
  });

  it('keeps "selected" and the "+" at the end of the name', () => {
    expect(lookName({ ...SEO_YEON, exact: true, selected: true })).toBe('person:full:free:f2:photo:exact:selected');
    expect(lookName({ ...SEO_YEON, exact: true, addable: true })).toBe('person:full:free:f2:photo:exact:addable');
  });
});

// Partitions: a person's look with the "+" and without it; with the green dot and without it.
describe("a person's look drawn", () => {
  it('carries the "+" of a Friend who can be added, and none without it', async () => {
    const { rerender } = await render(<LookView look={{ ...SEO_YEON, addable: true }} />);
    expect(screen.getByText('+')).toBeVisible();

    await rerender(<LookView look={SEO_YEON} />);
    expect(screen.queryByText('+')).toBeNull();
  });

  it('carries the green dot of a Friend at the exact level, and none without it', async () => {
    const { rerender } = await render(<LookView look={{ ...SEO_YEON, exact: true }} testID="look" />);
    expect(screen.getByTestId('look:exact')).toBeVisible();

    await rerender(<LookView look={SEO_YEON} testID="look" />);
    expect(screen.queryByTestId('look:exact')).toBeNull();
  });
});

describe("a group's look on the map", () => {
  it('is named by its kinds, its form and whether it is selected', () => {
    const looks: MarkerLook[] = [
      { kind: 'group', kinds: ['official', 'party'], form: 'pin' },
      { kind: 'group', kinds: ['official', 'party'], form: 'dot' },
      { kind: 'group', kinds: ['official', 'party'], form: 'pin', selected: true },
      { kind: 'group', kinds: ['party', 'dining', 'shuttle'], form: 'pin' },
    ];
    const names = looks.map((look) => lookName(look));

    expect(names).toEqual([
      'group:official+party:pin',
      'group:official+party:dot',
      'group:official+party:pin:selected',
      'group:party+dining+shuttle:pin',
    ]);
  });
});

// Partitions: a 행사's, a 파티's or a group's tag with its name and without, and a name that holds the separator.
describe("a tag's look with its name, from the map's closest level", () => {
  it('has a name of its own for each name, and draws the name in the tag', async () => {
    const party: MarkerLook = { kind: 'party', form: 'pin', label: '저녁 약속' };
    const group: MarkerLook = { kind: 'group', kinds: ['official', 'party'], form: 'pin', label: '301동' };

    expect(lookName(party)).toBe('party:pin:label="저녁 약속"');
    expect(lookName(group)).toBe('group:official+party:pin:label="301동"');
    expect(lookName({ kind: 'party', form: 'pin', label: 'a:selected' })).not.toBe(
      lookName({ kind: 'party', form: 'pin', label: 'a', selected: true }),
    );

    await render(<LookView look={party} />);
    expect(screen.getByText('저녁 약속')).toBeVisible();
  });
});
