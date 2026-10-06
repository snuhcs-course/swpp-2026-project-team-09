import { router, type SitemapType, useSitemap } from 'expo-router';
import { useCallback } from 'react';
import { useNotReadyToast } from '@/design-system';

const PARTY_CREATE = '/party/create';

// The address without its groups: "/(signed-in)/party/create" is "/party/create".
function addressOf(href: SitemapType['href']): string {
  const path = typeof href === 'string' ? href : href.pathname;
  return path.replaceAll(/\/\([^/]+\)/gu, '') || '/';
}

function holds(node: SitemapType, address: string): boolean {
  return addressOf(node.href) === address || node.children.some((child) => holds(child, address));
}

// Opens 파티 만들기 with a Global Event chosen, `/party/create?eventId=…`. Another task builds that screen: until the
// app has it, the control says that it is not ready.
export function useOpenPartyCreate(): (eventId: string) => void {
  const sitemap = useSitemap();
  const showNotReady = useNotReadyToast();
  const ready = sitemap !== null && holds(sitemap, PARTY_CREATE);
  return useCallback(
    (eventId: string) => {
      if (ready) {
        router.push({ pathname: PARTY_CREATE, params: { eventId } });
      } else {
        showNotReady();
      }
    },
    [ready, showNotReady],
  );
}
