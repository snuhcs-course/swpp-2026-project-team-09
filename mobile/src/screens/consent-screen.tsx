/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Pressable, ScrollView, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut } from '@/auth/sign-in';
import { agreeToDocuments } from '@/consent/choices';
import { Button, color, radius, size, space, text, useToast, useToastAbove } from '@/design-system';
import { useSession } from '@/session/session';
import { CheckBox } from './check-box';
import {
  ERROR_REPORTS_HEADING,
  LEGAL_DOCUMENTS,
  type LegalDocument,
  USAGE_HEADING,
  USAGE_PART,
} from './legal-documents';

// Names the privacy policy's part on error reports, which are sent from the start unless the User turns them off.
export const CONSENT_ERROR_REPORTS = `개인정보 처리방침의 '${ERROR_REPORTS_HEADING}'에 앱에 오류가 나면 무엇을 누구에게 보내는지 적혀 있어요. 내 정보 › 오류 보고 보내기에서 언제든 끌 수 있어요.`;

// The optional item on usage data, its link, and the words of a failed send (P08 ticket 11). A draft that a person reviews before the Release.
export const USAGE_ITEM = {
  label: '사용 기록 보내기 (선택)',
  sentence:
    '앱에서 연 화면과 쓴 기능의 기록을 PostHog(미국)에 보내 SNU Now를 고치는 데 써요. 고르지 않아도 모든 기능을 쓸 수 있고, 내 정보에서 언제든 바꿀 수 있어요.',
  link: `개인정보 처리방침의 '${USAGE_HEADING}' 보기`,
} as const;
export const CONSENT_NOT_SAVED = '동의를 저장하지 못했어요. 잠시 후 다시 눌러 주세요.';

const DOCUMENTS: readonly LegalDocument[] = ['terms', 'privacy', 'location'];
const WIDEST = 390;

function DocumentRow({ document }: { document: LegalDocument }): ReactElement {
  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => {
        // The same document asked for twice is opened once.
        router.navigate({ pathname: '/legal/[document]', params: { document } });
      }}
      style={({ pressed }): StyleProp<ViewStyle> => [styles.row, pressed && styles.rowPressed]}
    >
      <Text style={styles.rowWords}>{LEGAL_DOCUMENTS[document]}</Text>
    </Pressable>
  );
}

// The optional item: a box, not ticked at first, with its sentence and a link to the privacy policy's part.
// Takes no press while "동의하고 시작" is at work, so that what is sent is what the box shows.
function UsageItem({
  chosen,
  disabled,
  onToggle,
}: {
  chosen: boolean;
  disabled: boolean;
  onToggle: () => void;
}): ReactElement {
  return (
    <View style={styles.item}>
      <Pressable
        accessibilityLabel={USAGE_ITEM.label}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: chosen, disabled }}
        disabled={disabled}
        onPress={onToggle}
        style={styles.choose}
      >
        <CheckBox checked={chosen} />
        <Text style={styles.itemLabel}>{USAGE_ITEM.label}</Text>
      </Pressable>
      <Text style={styles.itemSentence}>{USAGE_ITEM.sentence}</Text>
      <Pressable
        accessibilityRole="link"
        hitSlop={space[2]}
        onPress={() => {
          router.navigate({ pathname: '/legal/[document]', params: { document: 'privacy', part: USAGE_PART } });
        }}
        style={({ pressed }): StyleProp<ViewStyle> => [styles.itemLink, pressed && styles.itemLinkPressed]}
      >
        <Text style={styles.itemLinkWords}>{USAGE_ITEM.link}</Text>
      </Pressable>
    </View>
  );
}

// What the buttons do. One at a time: while one is at work, neither takes a press. "동의하고 시작" goes on only once the
// account took the consent; a failed send says so, and the button tries again.
function useConsent(usage: boolean): { working: boolean; agreed: () => void; out: () => void } {
  const { agree, leave } = useSession();
  const showToast = useToast();
  const [working, setWorking] = useState(false);
  const agreed = (): void => {
    setWorking(true);
    agreeToDocuments(usage).then(agree, () => {
      setWorking(false);
      showToast(CONSENT_NOT_SAVED);
    });
  };
  const out = (): void => {
    setWorking(true);
    void signOut()
      .catch(() => null)
      .then(leave);
  };
  return { working, agreed, out };
}

// Asks the User to agree to the three legal documents, after a sign-in and before Onboarding, whenever the account
// holds no consent to the current version and none is carried over from this phone (`consentScreenAsks`), and to
// choose on usage data. A User who does not agree
// signs out. No wireframe draws this screen; its look is the design system's.
export function ConsentScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const [usage, setUsage] = useState(false);
  const { working, agreed, out } = useConsent(usage);
  const [foot, setFoot] = useState(0);
  useToastAbove(Math.max(0, foot - insets.bottom));
  return (
    <View style={styles.screen}>
      <View style={styles.column}>
        <ScrollView bounces={false} contentContainerStyle={[styles.upper, { paddingTop: insets.top + space[10] }]}>
          <Text accessibilityRole="header" style={styles.title}>
            약관에 동의해 주세요
          </Text>
          <Text style={styles.sentence}>SNU Now를 쓰려면 아래 약관에 동의해야 해요.</Text>
          <View style={styles.list}>
            {DOCUMENTS.map((document) => (
              <DocumentRow document={document} key={document} />
            ))}
          </View>
          <Text style={styles.note}>{CONSENT_ERROR_REPORTS}</Text>
          <UsageItem
            chosen={usage}
            disabled={working}
            onToggle={() => {
              setUsage((now) => !now);
            }}
          />
        </ScrollView>
        <View
          onLayout={(event) => {
            setFoot(event.nativeEvent.layout.height);
          }}
          style={[styles.foot, { paddingBottom: insets.bottom + space[4] }]}
        >
          <Button disabled={working} full onPress={agreed} size="lg">
            동의하고 시작
          </Button>
          <Button centred disabled={working} onPress={out} variant="ghost">
            로그아웃
          </Button>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  // A phone's width, in the middle of a wider screen.
  column: { flex: 1, alignSelf: 'center', width: '100%', maxWidth: WIDEST },
  upper: { paddingHorizontal: space[6], paddingBottom: space[6] },
  title: { ...text.titleLg, color: color.ink },
  sentence: { ...text.body, marginTop: space[2], color: color.inkMuted },
  list: { marginTop: space[8], borderTopWidth: 1, borderTopColor: color.border },
  row: {
    minHeight: size.appBar,
    justifyContent: 'center',
    paddingHorizontal: space[1],
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowPressed: { backgroundColor: color.blue50 },
  rowWords: { ...text.bodyLg, color: color.blue600 },
  note: { ...text.body, marginTop: space[4], color: color.inkMuted },
  item: { gap: space[2], marginTop: space[6], paddingTop: space[4], borderTopWidth: 1, borderTopColor: color.border },
  choose: { flexDirection: 'row', alignItems: 'center', gap: space[2], minHeight: 44 },
  itemLabel: { ...text.bodyLg, color: color.ink },
  itemSentence: { ...text.body, color: color.inkMuted },
  itemLink: { alignSelf: 'flex-start', borderRadius: radius.sm },
  itemLinkPressed: { backgroundColor: color.surfaceSunken },
  itemLinkWords: { ...text.label, color: color.snuBlue, textDecorationLine: 'underline' },
  foot: { gap: space[3], paddingTop: space[3], paddingHorizontal: space[6] },
});
