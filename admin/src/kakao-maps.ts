import { type RefObject, useEffect, useState } from 'react';

// Kakao Maps' JavaScript SDK, loaded once in the browser with the admin site's JavaScript key. Only the parts the site
// uses are typed here.

export interface Position {
  latitude: number;
  longitude: number;
}

export interface LatLng {
  getLat: () => number;
  getLng: () => number;
}

export interface KakaoMap {
  panTo: (position: LatLng) => void;
  setCenter: (position: LatLng) => void;
  setBounds: (bounds: LatLngBounds) => void;
  addControl: (control: unknown, position: number) => void;
}

export interface LatLngBounds {
  extend: (position: LatLng) => void;
}

export interface Overlay {
  setMap: (map: KakaoMap | null) => void;
}

export interface Marker extends Overlay {
  setPosition: (position: LatLng) => void;
}

export interface Polygon extends Overlay {
  setOptions: (options: PolygonLook) => void;
}

export interface PolygonLook {
  strokeColor?: string;
  strokeWeight?: number;
  fillColor?: string;
  fillOpacity?: number;
  zIndex?: number;
}

export interface KakaoMaps {
  load: (callback: () => void) => void;
  LatLng: new (latitude: number, longitude: number) => LatLng;
  LatLngBounds: new () => LatLngBounds;
  Map: new (container: HTMLElement, options: { center: LatLng; level: number }) => KakaoMap;
  Marker: new (options: { position: LatLng; map?: KakaoMap; title?: string }) => Marker;
  Polygon: new (options: { path: LatLng[]; map?: KakaoMap } & PolygonLook) => Polygon;
  CustomOverlay: new (options: { position: LatLng; content: HTMLElement; map?: KakaoMap; yAnchor?: number }) => Overlay;
  MapTypeControl: new () => unknown;
  ControlPosition: { TOPRIGHT: number };
  event: {
    addListener: (target: unknown, type: 'click', handler: (event: { latLng: LatLng }) => void) => void;
  };
}

declare global {
  interface Window {
    kakao?: { maps: KakaoMaps };
  }
}

// Roughly the middle of the Gwanak campus.
export const CAMPUS_CENTER: Position = { latitude: 37.4598, longitude: 126.9519 };

// Without a key the site works without the map.
export function kakaoJavaScriptKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY;
  return key === undefined || key === '' ? undefined : key;
}

let loading: Promise<KakaoMaps> | undefined;

export function loadKakaoMaps(key: string): Promise<KakaoMaps> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(key)}&autoload=false`;
    script.addEventListener('load', () => {
      const maps = window.kakao?.maps;
      if (maps === undefined) {
        reject(new Error('Kakao Maps did not load.'));
        return;
      }
      maps.load(() => {
        resolve(maps);
      });
    });
    script.addEventListener('error', () => {
      loading = undefined;
      reject(new Error('Kakao Maps did not load.'));
    });
    document.head.append(script);
  });
  return loading;
}

export interface LoadedMap {
  maps: KakaoMaps;
  map: KakaoMap;
}

// Loads Kakao's map into `container`, on the campus. `failed` when the SDK did not load, such as on an address its key
// is not registered for.
export function useKakaoMap(
  container: RefObject<HTMLDivElement | null>,
  level: number,
): { loaded: LoadedMap | null; failed: boolean } {
  const [loaded, setLoaded] = useState<LoadedMap | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const key = kakaoJavaScriptKey();
    let live = key !== undefined;
    if (key !== undefined) {
      loadKakaoMaps(key).then(
        (maps) => {
          if (live && container.current !== null) {
            const center = new maps.LatLng(CAMPUS_CENTER.latitude, CAMPUS_CENTER.longitude);
            setLoaded({ maps, map: new maps.Map(container.current, { center, level }) });
          }
        },
        () => {
          setFailed(true);
        },
      );
    }
    return (): void => {
      live = false;
    };
  }, [container, level]);

  return { loaded, failed };
}
