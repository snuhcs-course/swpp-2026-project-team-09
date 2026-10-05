import type { PartyNews } from '@/api/types';

// The number on the bottom navigation's 파티. Nothing waiting shows no badge.
export function toPartyBadge(news: PartyNews | undefined): number {
  return Math.max(0, Math.trunc(news?.count ?? 0));
}
