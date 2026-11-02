/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// What the app knows of 관정도서관's booking site, k-rsv.snu.ac.kr: its addresses, the calls the app may make there,
// and which pages belong to it. The library client and the injected script hold the same allow-list.

export const LIBRARY_HOST = 'k-rsv.snu.ac.kr';

const BASE = `https://${LIBRARY_HOST}/NEW_SNU_BOOKING`;

// The page both web views open: it sends a User without a session to the school's login, and the hidden view's
// scripts run on its origin.
export const LIBRARY_MAIN_URL = `${BASE}/pc/main`;

// The site's logout, the target of its own 로그아웃 link (seen on /pc/booking/floorList when the site was mapped). It ends
// the school's single sign-on session too.
export const LIBRARY_LOGOUT_URL = `${BASE}/SSOService.do?pname=spLogout`;

// The calls that only read.
export const LIBRARY_READS = [
  'getSectorList',
  'getRoomList',
  'getSeatBookingList',
  'getSeatInfoFromList',
  'getUserCheck',
  'getMyBookingList',
] as const;

// The room form page, `GET /pc/booking/roomForm`, from which only the applicant's name and 학번 and the prefilled
// phone number and email come back.
export const LIBRARY_ROOM_FORM = 'roomForm';

// The calls that change a booking, sent only from a card's confirmed action. `setSeatReturn` is not among them: no
// button of the site uses it.
export const LIBRARY_WRITES = ['setRoomBooking', 'setCancelBooking'] as const;

export type LibraryRead = (typeof LIBRARY_READS)[number];
export type LibraryWrite = (typeof LIBRARY_WRITES)[number];
export type LibraryEndpoint = LibraryRead | LibraryWrite | typeof LIBRARY_ROOM_FORM;

export function isLibraryWrite(endpoint: string): endpoint is LibraryWrite {
  return (LIBRARY_WRITES as readonly string[]).includes(endpoint);
}

export function isLibraryEndpoint(endpoint: string): endpoint is LibraryEndpoint {
  return (
    endpoint === LIBRARY_ROOM_FORM ||
    (LIBRARY_READS as readonly string[]).includes(endpoint) ||
    isLibraryWrite(endpoint)
  );
}

function urlOf(address: string): URL | null {
  try {
    return new URL(address);
  } catch {
    return null;
  }
}

// A page of the site itself, over HTTPS. Messages from any other page are ignored.
export function isOnLibrarySite(address: string): boolean {
  const url = urlOf(address);
  return url !== null && url.protocol === 'https:' && url.hostname === LIBRARY_HOST;
}

// A page of the booking site's own screens, where the hidden view must stay. Anywhere else the session has ended.
export function isLibraryPage(address: string): boolean {
  const url = urlOf(address);
  return url !== null && isOnLibrarySite(address) && url.pathname.startsWith('/NEW_SNU_BOOKING/pc/');
}

// The login is done once the web view is back on the site at its main, booking or my-booking screen.
export function isLoginDone(address: string): boolean {
  const url = urlOf(address);
  return url !== null && isOnLibrarySite(address) && /\/pc\/(main|booking|mybooking)(\/|$)/u.test(url.pathname);
}

// The seat map of a reading room's sector, a plain image that loads with no cookie.
export function seatMapUrl(sectorNo: number | string): string {
  return `https://${LIBRARY_HOST}:444/MAP/WEB/area_${String(sectorNo)}.png?version=20261022`;
}

// A room's photo, a plain image that loads with no cookie. The site keeps some as PNG and some as JPEG.
export function roomPhotoUrl(seatNo: number | string, kind: 'png' | 'jpg' = 'png'): string {
  return `https://${LIBRARY_HOST}:444/MAP/POP/pop_${String(seatNo)}.${kind}`;
}
