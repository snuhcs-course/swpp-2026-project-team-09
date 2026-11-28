/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-24  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-29  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { router } from 'expo-router';
import { type ReactElement, useState } from 'react';
import { Pressable, ScrollView, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { signOut } from '@/auth/sign-in';
import { agreeToDocuments } from '@/consent/choices';
import { Button, color, font, radius, size, space, text, useToast, useToastAbove } from '@/design-system';
import { useSession } from '@/session/session';
import {
  ERROR_REPORTS_HEADING,
  LEGAL_DOCUMENTS,
  type LegalDocument,
  USAGE_HEADING,
  USAGE_PART,
} from './legal-documents';

// Names the privacy policy's part on error reports, which are sent from the start unless the User turns them off.
export const CONSENT_ERROR_REPORTS = `개인정보 처리방침의 '${ERROR_REPORTS_HEADING}'에 앱에 오류가 나면 무엇을 누구에게 보내는지 적혀 있어요. 내 정보 › 오류 보고 보내기에서 언제든 끌 수 있어요.`;

// The item on usage data, its link, its two answers and the words under "동의하고 시작" while neither is chosen (P08
// tickets 11 and 17). The item stays optional (선택): either answer starts the app; only an answer is required.
export const USAGE_ITEM = {
  kicker: '선택',
  title: '사용 기록을 앱 개선에 이용해요',
  sentence:
    '연 화면과 쓴 기능의 기록만 PostHog(미국)에 보내요. 이름이나 글 내용은 보내지 않아요. 내 정보에서 언제든 바꿀 수 있어요.',
  link: `개인정보 처리방침의 '${USAGE_HEADING}' 보기`,
  yes: '확인',
  yesLabel: '확인 (사용 기록 보내기)',
  no: 'X',
  noLabel: 'X (사용 기록 보내지 않기)',
  hint: '사용 기록을 고르면 시작할 수 있어요',
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

// One of the item's two answers: the secondary button's look, or, chosen, a light navy ground inside a navy rim.
function UsageAnswer({
  words,
  label,
  chosen,
  disabled,
  onPress,
}: {
  words: string;
  label: string;
  chosen: boolean;
  disabled: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ checked: chosen, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => [
        styles.answer,
        chosen ? styles.answerChosen : pressed && styles.answerPressed,
      ]}
    >
      <Text style={styles.answerWords}>{words}</Text>
    </Pressable>
  );
}

// The item on usage data, in a soft box: its title, one sentence, a link to the privacy policy's part, and two answers,
// X on the left and 확인 on the right, neither chosen at first (P08 ticket 17). Takes no press while "동의하고 시작" is
// at work, so that what is sent is what the answers show.
function UsageItem({
  usage,
  disabled,
  onChoose,
}: {
  usage: boolean | null;
  disabled: boolean;
  onChoose: (usage: boolean) => void;
}): ReactElement {
  return (
    <View style={styles.item}>
      <Text style={styles.itemKicker}>{USAGE_ITEM.kicker}</Text>
      <Text style={styles.itemTitle}>{USAGE_ITEM.title}</Text>
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
      <View accessibilityLabel={USAGE_ITEM.title} accessibilityRole="radiogroup" style={styles.answers}>
        <UsageAnswer
          chosen={usage === false}
          disabled={disabled}
          label={USAGE_ITEM.noLabel}
          onPress={() => {
            onChoose(false);
          }}
          words={USAGE_ITEM.no}
        />
        <UsageAnswer
          chosen={usage === true}
          disabled={disabled}
          label={USAGE_ITEM.yesLabel}
          onPress={() => {
            onChoose(true);
          }}
          words={USAGE_ITEM.yes}
        />
      </View>
    </View>
  );
}

// What the buttons do. One at a time: while one is at work, neither takes a press. "동의하고 시작" goes on only once the
// account took the consent; a failed send says so, and the button tries again.
function useConsent(usage: boolean | null): { working: boolean; agreed: () => void; out: () => void } {
  const { agree, leave } = useSession();
  const showToast = useToast();
  const [working, setWorking] = useState(false);
  const agreed = (): void => {
    if (usage === null) return;
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
  const [usage, setUsage] = useState<boolean | null>(null);
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
          <UsageItem disabled={working} onChoose={setUsage} usage={usage} />
        </ScrollView>
        <View
          onLayout={(event) => {
            setFoot(event.nativeEvent.layout.height);
          }}
          style={[styles.foot, { paddingBottom: insets.bottom + space[4] }]}
        >
          <Button disabled={working || usage === null} full onPress={agreed} size="lg">
            동의하고 시작
          </Button>
          {usage === null ? <Text style={styles.hint}>{USAGE_ITEM.hint}</Text> : null}
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
  item: {
    marginTop: space[6],
    padding: space[4],
    borderRadius: radius.lg,
    backgroundColor: color.surfaceSubtle,
  },
  itemKicker: { ...text.caption, fontFamily: font.semiBold, color: color.inkFaint },
  itemTitle: { ...text.title, fontFamily: font.bold, fontSize: 17, marginTop: space[1], color: color.ink },
  itemSentence: { ...text.body, fontSize: 13, lineHeight: 20, marginTop: space[1], color: color.inkMuted },
  itemLink: { alignSelf: 'flex-start', marginTop: space[2], borderRadius: radius.sm },
  itemLinkPressed: { backgroundColor: color.surfaceSunken },
  itemLinkWords: { ...text.label, color: color.snuBlue, textDecorationLine: 'underline' },
  answers: { flexDirection: 'row', gap: space[3], marginTop: space[4] },
  answer: {
    flex: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.borderStrong,
    backgroundColor: color.surface,
  },
  answerPressed: { backgroundColor: color.blue50 },
  answerChosen: { borderWidth: 2, borderColor: color.snuBlue, backgroundColor: color.blue100 },
  answerWords: { ...text.label, fontSize: 15, color: color.snuBlue },
  hint: { ...text.caption, fontFamily: font.regular, textAlign: 'center', color: color.inkMuted },
  foot: { gap: space[3], paddingTop: space[3], paddingHorizontal: space[6] },
});
