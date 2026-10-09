// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by AhnJinYoung
import type { MarkerLook } from '@/map';
import { lookName } from '@/map/marker-looks';

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
});
