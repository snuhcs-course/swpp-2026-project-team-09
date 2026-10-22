/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { act, renderHook } from '@testing-library/react-native';
import { startFresh } from './support/mocks';
import { apiClient } from '@/api/client';
import { AppProviders } from '@/app-providers';
import { firstForm } from '@/screens/onboarding/form';
import { addInterests } from '@/screens/onboarding/interests';
import { cut, lengthOf } from '@/screens/onboarding/length';
import { scrollToShow } from '@/screens/onboarding/reveal';
import { useOnboarding } from '@/screens/onboarding/use-onboarding';

describe('a length', () => {
  it('counts an emoji as one character, as a Korean syllable', () => {
    expect(lengthOf('가나')).toBe(2);
    expect(lengthOf('😀😀')).toBe(2);
  });

  it('is never cut inside a character', () => {
    expect(cut('가😀나', 2)).toBe('가😀');
    expect(cut('😀😀😀', 1)).toBe('😀');
    expect(cut('가나', 5)).toBe('가나');
  });
});

describe('adding interests', () => {
  it('leaves what was typed when none was added', () => {
    expect(addInterests(['러닝'], ' #러닝 ')).toEqual({ interests: ['러닝'], left: ' #러닝 ', refusal: 'twice' });
  });

  it('leaves only those that were not added, with the first reason', () => {
    const long = '가'.repeat(31);
    expect(addInterests(['러닝'], `재즈,${long} #러닝`)).toEqual({
      interests: ['러닝', '재즈'],
      left: `${long} 러닝`,
      refusal: 'long',
    });
  });

  it('counts one typed twice at once as there already', () => {
    expect(addInterests([], 'Jazz jazz')).toEqual({ interests: ['Jazz'], left: 'jazz', refusal: 'twice' });
  });
});

describe('showing an open list', () => {
  const view = { top: 100, bottom: 500 };

  it('scrolls nothing for a list that ends above the lower edge', () => {
    expect(scrollToShow({ top: 150, bottom: 400 }, view)).toBe(0);
  });

  it('scrolls a list that runs under the lower edge clear of it', () => {
    expect(scrollToShow({ top: 300, bottom: 560 }, view)).toBe(72);
  });

  it('keeps the field in view where the list is higher than what is seen, as on a small screen', () => {
    expect(scrollToShow({ top: 140, bottom: 600 }, { top: 100, bottom: 220 })).toBe(40);
  });
});

describe('a save asked for twice before the screen is drawn again', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    await startFresh();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('is sent once', async () => {
    const sent = jest.spyOn(apiClient, 'completeOnboarding');
    const { result } = await renderHook(() => useOnboarding(), { wrapper: AppProviders });
    const form = firstForm({ name: '홍길동', department: '컴퓨터공학부' });

    await act(async () => {
      result.current.save(form);
      result.current.save(form);
      await jest.advanceTimersByTimeAsync(400);
    });

    expect(sent).toHaveBeenCalledTimes(1);
    sent.mockRestore();
  });
});
