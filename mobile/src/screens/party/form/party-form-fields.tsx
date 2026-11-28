/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-22  Opus 5.5   prompted by TaeHyun79
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-27  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { ReactElement, ReactNode, Ref } from 'react';
import { Keyboard, Pressable, StyleSheet, Text, View } from 'react-native';
import type { Board } from '@/api/types';
import { color, eventText, font, Icon, type IconName, radius, space } from '@/design-system';
import { BOARDS } from '@/features/party/boards';
import { MAX_CAPACITY, type PartyForm, type Visibility, withVisibility } from '@/features/party/making';
import { LineIcon, type LineIconName } from '../line-icon';
import { MarkLine, markStyles, Required } from './mark';
import { SmallToggle, StepButton } from './small-controls';

// '파티 설정', changed in place: 인원, 공개 범위, and under 공개 참여 방식 and 게시판, then 친구 초대, the one that opens a
// sheet. A press here drops the keyboard, as a press anywhere outside the title and the text does.

type Change = (change: Partial<PartyForm>) => void;

function changing(onChange: Change, change: Partial<PartyForm>): void {
  Keyboard.dismiss();
  onChange(change);
}

interface RowProps {
  icon: LineIconName;
  label: string;
  required?: boolean;
  // At the row's right.
  children?: ReactNode;
}

// A row of 52: the icon, the name and what changes it.
function Row({ icon, label, required = false, children }: RowProps): ReactElement {
  return (
    <View style={styles.row}>
      <LineIcon name={icon} size={ICON} tint={color.ink} />
      <Text style={styles.label}>
        {label}
        {required ? <Required /> : null}
      </Text>
      {children}
    </View>
  );
}

interface CapacityProps {
  form: PartyForm;
  // 2 under 공개, and the Holders now and the Friends invited: `인원` goes no lower.
  least: number;
  // Why `인원` goes no lower, said at the floor.
  floor: string | null;
  onChange: Change;
}

// `인원`: a small stepper up to 8, and at its floor the reason in a grey line.
export function CapacityRow({ form, least, floor, onChange }: CapacityProps): ReactElement {
  const { capacity } = form;
  const atFloor = capacity <= least;
  return (
    <View style={styles.block}>
      <Row icon="users" label="인원">
        <View style={styles.stepper}>
          <StepButton
            disabled={atFloor}
            icon="minus"
            label="인원 줄이기"
            onPress={() => {
              changing(onChange, { capacity: capacity - 1 });
            }}
          />
          <Text style={styles.count}>{`${String(capacity)}명`}</Text>
          <StepButton
            disabled={capacity >= MAX_CAPACITY}
            icon="plus"
            label="인원 늘리기"
            onPress={() => {
              changing(onChange, { capacity: capacity + 1 });
            }}
          />
        </View>
      </Row>
      {atFloor && floor !== null ? <Text style={styles.under}>{floor}</Text> : null}
    </View>
  );
}

const VISIBILITY: readonly { key: Visibility; label: string; icon: IconName }[] = [
  { key: 'public', label: '공개', icon: 'users' },
  { key: 'private', label: '비공개', icon: 'lock' },
];

const POLICIES: readonly { key: PartyForm['policy']; label: string }[] = [
  { key: 'open', label: '바로 참여' },
  { key: 'approval', label: '승인 후 참여' },
];

// `공개 범위`, and under 공개 `참여 방식` on an indented row. Choosing 공개 raises `인원` to its least.
export function VisibilityRows({ form, onChange }: { form: PartyForm; onChange: Change }): ReactElement {
  return (
    <>
      <View style={styles.block}>
        <Row icon="eye" label="공개 범위">
          <SmallToggle
            label="공개 범위"
            onSelect={(visibility) => {
              onChange(withVisibility(form, visibility));
            }}
            options={VISIBILITY}
            selected={form.visibility}
          />
        </Row>
      </View>
      {form.visibility === 'public' ? (
        <View style={[styles.block, styles.indented]}>
          <Text style={styles.subLabel}>참여 방식</Text>
          <SmallToggle
            label="참여 방식"
            onSelect={(policy) => {
              onChange({ policy });
            }}
            options={POLICIES}
            selected={form.policy}
          />
        </View>
      ) : null}
    </>
  );
}

interface BoardProps {
  board: Board | null;
  marked: boolean;
  frameRef: Ref<View>;
  onChange: Change;
}

// `게시판`, required under 공개: the four boards at once as pills, in 찾기's filter look.
export function BoardRow({ board, marked, frameRef, onChange }: BoardProps): ReactElement {
  return (
    <View style={styles.block}>
      <View ref={frameRef} style={[markStyles.frame, marked && markStyles.marked, styles.boardFrame]}>
        <Row icon="clipboard" label="게시판" required>
          {marked ? <MarkLine missing="board" /> : null}
        </Row>
        <View accessibilityLabel="게시판" accessibilityRole="radiogroup" style={styles.pills}>
          {BOARDS.map(({ key, name }) => {
            const on = key === board;
            return (
              <Pressable
                accessibilityLabel={`${name} 게시판`}
                accessibilityRole="radio"
                accessibilityState={{ checked: on }}
                key={key}
                onPress={() => {
                  changing(onChange, { board: key });
                }}
                style={[styles.pill, on && styles.pillOn]}
              >
                <Text style={on ? styles.pillWordsOn : styles.pillWords}>{name}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

interface FriendsProps {
  // The chosen Friends' names.
  names: readonly string[];
  // Under 비공개, which invites at least one Friend.
  required: boolean;
  marked: boolean;
  frameRef: Ref<View>;
  onOpen: () => void;
}

// `친구 초대`: the chosen names, or '고르기', and a press that opens its sheet.
export function FriendsRow({ names, required, marked, frameRef, onOpen }: FriendsProps): ReactElement {
  const words = names.length === 0 ? '고르기' : names.join(', ');
  return (
    <View style={styles.block}>
      <View ref={frameRef} style={[markStyles.frame, marked && markStyles.marked]}>
        <Pressable
          accessibilityLabel={`친구 초대 ${words}`}
          accessibilityRole="button"
          onPress={() => {
            Keyboard.dismiss();
            onOpen();
          }}
        >
          <Row icon="personPlus" label="친구 초대" required={required}>
            <Text numberOfLines={1} style={[styles.chosen, names.length === 0 && styles.unset]}>
              {words}
            </Text>
            <Icon color={color.inkSubtle} name="chevronRight" size={16} />
          </Row>
        </Pressable>
        {marked ? (
          <View style={styles.markUnder}>
            <MarkLine missing="friends" />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const ICON = 18;
const PILL = 36;

const styles = StyleSheet.create({
  block: { borderBottomWidth: 1, borderBottomColor: color.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 52 },
  label: { flex: 1, fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: color.ink },
  under: {
    marginTop: -space[2],
    paddingBottom: space[2],
    paddingLeft: ICON + 10,
    fontFamily: font.regular,
    fontSize: 12,
    lineHeight: 16,
    color: color.inkMuted,
  },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  count: { minWidth: 32, textAlign: 'center', fontFamily: font.bold, fontSize: 15, lineHeight: 22, color: color.ink },
  indented: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingLeft: ICON + 10 },
  subLabel: { flex: 1, fontFamily: font.regular, fontSize: 14, lineHeight: 20, color: color.inkMuted },
  boardFrame: { paddingBottom: space[3] },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], paddingLeft: ICON + 10 },
  pill: {
    justifyContent: 'center',
    height: PILL,
    paddingHorizontal: space[4],
    borderRadius: radius.md,
    backgroundColor: color.surfaceSubtle,
  },
  pillOn: { backgroundColor: color.blue100 },
  pillWords: { ...eventText.filter, fontSize: 15, color: color.inkMuted },
  pillWordsOn: { ...eventText.filterChosen, fontSize: 15, color: color.snuBlue },
  chosen: { flexShrink: 1, maxWidth: '50%', fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.ink },
  unset: { fontFamily: font.regular, color: color.inkSubtle },
  markUnder: { paddingBottom: space[2], paddingLeft: ICON + 10 },
});
