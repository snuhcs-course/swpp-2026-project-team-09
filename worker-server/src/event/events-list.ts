const EVENTS = 'https://www.snu.ac.kr/snunow/events';

// The list's date filter, written as the page writes it: 2026.10.02.
export interface ListFilter {
  from: string;
  to: string;
}

// The pager's links drop the filter, so each page's address is built here.
export function listPageAddress({ from, to }: ListFilter, page: number): string {
  return `${EVENTS}?sc=y&df=${from}&dt=${to}&page=${page}`;
}

// Also the page's canonical link.
export function postAddress(postNumber: number): string {
  return `${EVENTS}?md=v&bbsidx=${postNumber}`;
}
