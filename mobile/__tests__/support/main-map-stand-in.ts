/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { createRef } from 'react';
import type { MapCamera, MapHandle } from '@/map';
import type { MainMap } from '@/screens/main/use-main-map';

export function nothing(): void {
  // A move the test does not follow.
}

export interface Asked {
  fits: number;
  cameras: MapCamera[];
}

// A stand-in for the main screen's map, which records the fits and the moves it is asked.
export function mapOf(fitZoom: number | null, asked: Asked): MainMap {
  return {
    ref: createRef<MapHandle>(),
    onCameraIdle: nothing,
    onFitZoom: nothing,
    camera: null,
    fitZoom,
    detail: 'overview',
    zoomBy: nothing,
    goTo: nothing,
    showCampus: nothing,
    fitTo: nothing,
    fitAnswer: (): void => {
      asked.fits += 1;
    },
    moveTo: (camera): void => {
      asked.cameras.push(camera);
    },
  };
}
