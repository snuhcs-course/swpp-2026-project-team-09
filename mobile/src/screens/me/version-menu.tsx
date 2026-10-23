/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-22  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type ReactElement, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  type StyleProp,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { color, Dialog, font, Icon, type IconName, shadow, space, text } from '@/design-system';
import type { VersionsView } from '@/features/timetable/versions';
import type { TimetableVersions } from '@/features/timetable/use-versions';
import { type Place, ROW_HEIGHT, useLiftedPlace } from './menu-lift';
import { Rename } from './version-rename';

// The timetable versions on the week card, as the `Profile` frame draws them: the current version's name with ⌄ beside
// 시간표, and under it the list `시간표 버전`.

const MENU_WIDTH = 236;
const SMALL_BUTTON = 32;
const DELETE_OFF = '#D5D8E0';
const CHEVRON = '#9AA0B2';
const DIVIDER = '#F0F1F5';

// React Native's roles lack the frame's `listbox`; the web takes it as it is.
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a role React Native's types lack
const LISTBOX = { role: 'listbox' } as unknown as Pick<ViewProps, 'role'>;

function Action({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }): ReactElement {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }): StyleProp<ViewStyle> => [styles.option, pressed && styles.pressed]}
    >
      <Icon color={color.snuBlue} name={icon} size={14} />
      <Text style={[styles.optionWords, styles.actionWords]}>{label}</Text>
    </Pressable>
  );
}

interface RowProps {
  name: string;
  on: boolean;
  last: boolean;
  onPick: () => void;
  onRename: () => void;
  onDelete: () => void;
}

// A version in the list: the check on the current one, which also has 이름 바꾸기 and 이 시간표 삭제.
function VersionRow({ name, on, last, onPick, onRename, onDelete }: RowProps): ReactElement {
  return (
    <View style={styles.optionRow}>
      <Pressable
        aria-selected={on}
        onPress={onPick}
        role="option"
        style={({ pressed }): StyleProp<ViewStyle> => [styles.option, styles.optionFill, pressed && styles.pressed]}
      >
        <View style={[styles.check, !on && styles.hidden]}>
          <Icon color={color.snuBlue} name="check" size={14} />
        </View>
        <Text numberOfLines={1} style={[styles.optionWords, styles.optionName, on && styles.currentName]}>
          {name}
        </Text>
      </Pressable>
      {on ? (
        <>
          <Pressable
            accessibilityLabel="이름 바꾸기"
            accessibilityRole="button"
            onPress={onRename}
            style={({ pressed }): StyleProp<ViewStyle> => [styles.small, pressed && styles.pressed]}
          >
            <Icon color={color.inkFaint} name="pencil" size={14} />
          </Pressable>
          <Pressable
            accessibilityLabel="이 시간표 삭제"
            accessibilityRole="button"
            accessibilityState={{ disabled: last }}
            disabled={last}
            onPress={onDelete}
            style={[styles.small, styles.delete]}
          >
            <Icon color={last ? DELETE_OFF : color.danger} name="trash" size={14} />
          </Pressable>
        </>
      ) : null}
    </View>
  );
}

interface ListProps {
  versions: TimetableVersions;
  view: VersionsView;
  onClose: () => void;
  onDelete: (name: string) => void;
  place: Place;
}

// The list `시간표 버전`. Every choice closes it, except 이름 바꾸기, which turns the current row into a field; the list
// goes up while the keyboard would cover that field.
function VersionList({ versions, view, onClose, onDelete, place }: ListProps): ReactElement {
  const [renaming, setRenaming] = useState(false);
  const lifted = useLiftedPlace(place, view, renaming);
  const then = (change: () => void) => (): void => {
    onClose();
    change();
  };
  const renamed = (named: string | null): void => {
    setRenaming(false);
    if (named !== null) {
      versions.rename(named);
    }
  };
  return (
    <View aria-label="시간표 버전" {...LISTBOX} style={[styles.menu, lifted]}>
      {view.versions.map(({ id, name }) => {
        const on = id === view.currentId;
        return on && renaming ? (
          <Rename key={id} name={name} onDone={renamed} />
        ) : (
          <VersionRow
            key={id}
            last={view.versions.length < 2}
            name={name}
            on={on}
            onDelete={then(() => {
              onDelete(name);
            })}
            onPick={
              on
                ? onClose
                : then(() => {
                    versions.pick(id);
                  })
            }
            onRename={() => {
              setRenaming(true);
            }}
          />
        );
      })}
      <View style={styles.divider} />
      <Action icon="plus" label="빈 시간표 추가" onPress={then(versions.addEmpty)} />
      <Action icon="calendar" label="지금 시간표 복제" onPress={then(versions.duplicate)} />
    </View>
  );
}

function Trigger({
  name,
  busy,
  open,
  onPress,
}: {
  name: string;
  busy: boolean;
  open: boolean;
  onPress: () => void;
}): ReactElement {
  return (
    <Pressable
      accessibilityLabel={`시간표 버전 · ${name} (바꾸기)`}
      accessibilityRole="button"
      accessibilityState={{ expanded: open, busy, disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={styles.trigger}
    >
      <Text numberOfLines={1} style={styles.triggerWords}>
        {name}
      </Text>
      {busy ? (
        <ActivityIndicator color={CHEVRON} size={12} testID="version-busy" />
      ) : (
        <Icon color={CHEVRON} name="chevronDown" size={12} />
      )}
    </Pressable>
  );
}

// The trigger and, while open, the list, over the whole screen, so that a press anywhere outside it closes it. While a
// change is on its way the trigger turns into a spinner and takes no press.
export function VersionMenu({ versions }: { versions: TimetableVersions }): ReactElement | null {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [place, setPlace] = useState<Place>({ top: 0, right: space[4] });
  const anchor = useRef<View>(null);
  const { width } = useWindowDimensions();
  const { view } = versions;
  if (view === undefined) {
    return null;
  }
  const name = view.versions.find(({ id }) => id === view.currentId)?.name ?? '';
  const close = (): void => {
    setOpen(false);
  };
  const toggle = (): void => {
    anchor.current?.measureInWindow((x, y, anchorWidth, height) => {
      setPlace({ top: y + height, right: Math.max(width - x - anchorWidth, 0) });
    });
    setOpen(!open);
  };
  return (
    <View ref={anchor} style={styles.anchor}>
      <Trigger busy={versions.busy} name={name} onPress={toggle} open={open} />
      <Modal animationType="none" onRequestClose={close} statusBarTranslucent transparent visible={open}>
        <Pressable accessibilityLabel="닫기" onPress={close} style={StyleSheet.absoluteFill} />
        <VersionList onClose={close} onDelete={setDeleting} place={place} versions={versions} view={view} />
      </Modal>
      <Dialog
        cancelLabel="취소"
        confirmLabel="삭제"
        onCancel={() => {
          setDeleting(null);
        }}
        onConfirm={() => {
          setDeleting(null);
          versions.remove();
        }}
        title={`‘${deleting ?? name}’ 시간표를 삭제할까요?`}
        tone="danger"
        visible={deleting !== null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { position: 'relative', flexShrink: 1, alignItems: 'flex-end' },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 2,
    paddingLeft: 6,
    minHeight: 24,
  },
  triggerWords: { ...text.caption, color: color.inkMuted, flexShrink: 1 },
  menu: {
    position: 'absolute',
    marginTop: 2,
    width: MENU_WIDTH,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 14,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
    elevation: 8,
  },
  optionRow: { flexDirection: 'row', alignItems: 'center' },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: ROW_HEIGHT,
    paddingHorizontal: space[3],
  },
  optionFill: { flex: 1, minWidth: 0 },
  pressed: { backgroundColor: color.blue50 },
  check: { width: 16 },
  hidden: { opacity: 0 },
  optionWords: { fontFamily: font.medium, fontSize: 14, lineHeight: 20, color: color.ink },
  optionName: { flex: 1, minWidth: 0 },
  currentName: { fontFamily: font.bold },
  actionWords: { color: color.snuBlue },
  small: { width: SMALL_BUTTON, height: SMALL_BUTTON, alignItems: 'center', justifyContent: 'center' },
  delete: { marginRight: 6 },
  divider: { height: 1, marginVertical: 6, backgroundColor: DIVIDER },
});
