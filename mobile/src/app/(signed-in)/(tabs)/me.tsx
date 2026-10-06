import type { ReactElement } from 'react';
import { MeScreen } from '@/screens/me/me-screen';

// The 내 정보 tab. Its address can ask for the 위치 공유 card: `/me?show=sharing`, as the friend panel's "공유 설정"
// opens it.
export default function MeRoute(): ReactElement {
  return <MeScreen />;
}
