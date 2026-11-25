/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-27  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-01  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-16  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { type ReactElement, type RefObject, useEffect, useEffectEvent, useRef, useState } from 'react';
import { Pressable, ScrollView, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { lobbyQuery } from '@/api/queries';
import type { Profile } from '@/api/types';
import { signOut } from '@/auth/sign-in';
import {
  Avatar,
  Badge,
  Button,
  cardStyles,
  color,
  Dialog,
  font,
  Icon,
  radius,
  size,
  space,
  text,
} from '@/design-system';
import { waitingNotices } from '@/features/notifications/adapter';
import { useNotices } from '@/features/notifications/use-notices';
import { stopBackground, useSending } from '@/position';
import { useSession } from '@/session/session';
import { OffQuestion } from '../friends/off-question';
import { LocationExplanation } from '../main/location-explanation';
import { yearLabel } from '../onboarding/form';
import { TabScreen } from '../shell/tab-screen';
import { ActivityCard } from './activity-card';
import { BuildLine } from './build-line';
import { ErrorReportsRow } from './error-reports-row';
import { SharingCard } from './sharing-card';
import { TabTourRow } from './tab-tour-row';
import { TutorialRow } from './tutorial-row';
import { useSharingSwitch } from './use-sharing-switch';
import { LibraryCard } from './library-card';
import { WeekCard } from './week-card';

// How long the 위치 공유 card stays outlined after the friend panel's "공유 설정".
const OUTLINE_MS = 1200;

// The bell on the app bar, with the number of rows of 알림 that wait for the User in red.
function Bell(): ReactElement {
  const count = waitingNotices(useNotices().data ?? []).length;
  return (
    <Pressable
      accessibilityLabel={count > 0 ? `알림 ${count}개` : '알림'}
      accessibilityRole="button"
      onPress={() => {
        router.push('/notifications');
      }}
      style={({ pressed }): StyleProp<ViewStyle> => [styles.bell, pressed && styles.bellPressed]}
    >
      <Icon color={color.ink} name="bell" size={22} />
      {count > 0 ? (
        <View style={styles.count}>
          <Text style={styles.countWords}>{count > 9 ? '9+' : String(count)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

// "컴퓨터공학부 · 22학번", or the department alone without an admission year.
function metaOf({ department, admissionYear }: Profile): string {
  return admissionYear === null ? department : `${department} · ${yearLabel(admissionYear)}`;
}

function ProfileCard({ profile }: { profile: Profile }): ReactElement {
  return (
    <View style={[cardStyles.card, styles.profile]}>
      <View style={styles.who}>
        <Avatar name={profile.name} size="lg" />
        <View style={styles.whoWords}>
          <Text style={styles.name}>{profile.name}</Text>
          <Text style={styles.meta}>{metaOf(profile)}</Text>
          <Badge icon="check" tone="friend">
            SNU 계정 인증됨
          </Badge>
        </View>
      </View>
      <Button
        full
        onPress={() => {
          router.push('/profile-edit');
        }}
        variant="secondary"
      >
        프로필 편집
      </Button>
    </View>
  );
}

// "로그아웃", after the danger dialog. The sending, in front and in the background, stops before the Session ends.
function SignOut(): ReactElement {
  const { leave } = useSession();
  const { stop } = useSending();
  const [asking, setAsking] = useState(false);
  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          setAsking(true);
        }}
        style={({ pressed }): StyleProp<ViewStyle> => [styles.out, pressed && styles.outPressed]}
      >
        <Text style={styles.outWords}>로그아웃</Text>
      </Pressable>
      <Dialog
        cancelLabel="취소"
        confirmLabel="로그아웃"
        onCancel={() => {
          setAsking(false);
        }}
        onConfirm={() => {
          setAsking(false);
          stop();
          void stopBackground(true)
            .then(signOut)
            .catch(() => null)
            .then(leave);
        }}
        title="로그아웃할까요?"
        tone="danger"
        visible={asking}
      />
    </>
  );
}

// Scrolls to the 위치 공유 card while the address asks for it, and gives back that the card was shown after a while.
function useShowSharing(
  show: boolean,
  onShown: () => void,
): { scroll: RefObject<ScrollView | null>; setTop: (top: number) => void } {
  const scroll = useRef<ScrollView>(null);
  const [top, setTop] = useState<number | null>(null);
  const shown = useEffectEvent(onShown);
  useEffect(() => {
    if (show && top !== null) {
      scroll.current?.scrollTo({ y: Math.max(0, top - space[3]) });
    }
  }, [show, top]);
  useEffect((): (() => void) | void => {
    if (!show) {
      return;
    }
    const timer = setTimeout(() => {
      shown();
    }, OUTLINE_MS);
    return (): void => {
      clearTimeout(timer);
    };
  }, [show]);
  return { scroll, setTop };
}

interface MeScreenProps {
  // The address asks for the 위치 공유 card, as the friend panel's "공유 설정" does.
  showSharing: boolean;
  onSharingShown: () => void;
}

// The 내 정보 tab, the `Profile` frame: the User's profile, the 새내기 튜토리얼 row, the week, the Master Switch, the ways to
// the User's Friends, Parties, Quests, and interests, the tour of the tabs again, the library's login, the switch for
// error reports, the sign-out, and below it the build and update the phone runs.
export function MeScreen({ showSharing, onSharingShown }: MeScreenProps): ReactElement {
  const profile = useQuery(lobbyQuery).data?.profile;
  const sharing = useSharingSwitch();
  const { scroll, setTop } = useShowSharing(showSharing, onSharingShown);
  return (
    <TabScreen actions={<Bell />} title="내 정보">
      <ScrollView contentContainerStyle={styles.body} ref={scroll}>
        {profile === undefined ? null : <ProfileCard profile={profile} />}
        {profile === undefined ? null : <TutorialRow />}
        <WeekCard />
        <SharingCard
          onLayout={(event) => {
            setTop(event.nativeEvent.layout.y);
          }}
          outlined={showSharing}
          sharing={sharing}
        />
        <ActivityCard />
        <TabTourRow />
        <LibraryCard />
        <ErrorReportsRow />
        <SignOut />
        <BuildLine />
      </ScrollView>
      <LocationExplanation
        blocked={sharing.blocked}
        onAllow={sharing.allow}
        onLater={sharing.later}
        visible={sharing.explaining}
      />
      <OffQuestion name={null} onAnswer={sharing.answerOff} open={sharing.askingOff} />
    </TabScreen>
  );
}

const COUNT = 18;

const styles = StyleSheet.create({
  body: { gap: space[3], padding: space[4], paddingBottom: space[6] },
  bell: {
    alignItems: 'center',
    justifyContent: 'center',
    width: size.touchMin,
    height: size.touchMin,
    borderRadius: size.touchMin / 2,
  },
  bellPressed: { backgroundColor: color.surfaceSunken },
  count: {
    position: 'absolute',
    top: 6,
    right: 4,
    minWidth: COUNT,
    height: COUNT,
    paddingHorizontal: 5,
    borderRadius: radius.full,
    backgroundColor: color.danger,
  },
  countWords: { fontFamily: font.bold, fontSize: 11, lineHeight: COUNT, textAlign: 'center', color: color.onPrimary },
  profile: { gap: 14 },
  who: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  whoWords: { flex: 1, gap: 2 },
  name: { fontFamily: font.bold, fontSize: 20, lineHeight: 28, letterSpacing: -0.2, color: color.ink },
  meta: { ...text.label, fontFamily: font.regular, color: color.inkMuted },
  out: {
    alignSelf: 'center',
    justifyContent: 'center',
    height: 44,
    paddingHorizontal: space[4],
    borderRadius: radius.md,
  },
  outPressed: { backgroundColor: color.dangerSoft },
  outWords: { ...text.label, color: color.danger },
});
