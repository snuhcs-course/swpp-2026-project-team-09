/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { type ReactElement, useState } from 'react';
import { ActivityIndicator, Pressable, type StyleProp, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { color, Dialog, font, Icon, type IconName, shadow, space, text } from '@/design-system';
import type { VersionsView } from '@/features/timetable/versions';
import type { TimetableVersions } from '@/features/timetable/use-versions';
import { Rename } from './version-rename';

// The timetable versions on the week card, as the `Profile` frame draws them: the current version's name with ⌄ beside
// 시간표, and under it the list `시간표 버전`.

const MENU_WIDTH = 236;
const ROW_HEIGHT = 40;
const SMALL_BUTTON = 32;
const DELETE_OFF = '#D5D8E0';
const CHEVRON = '#9AA0B2';
const DIVIDER = '#F0F1F5';

interface MenuProps {
  versions: TimetableVersions;
  open: boolean;
  onOpen: (open: boolean) => void;
}

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
}

// The list `시간표 버전`. Every choice closes it, except 이름 바꾸기, which turns the current row into a field.
function VersionList({ versions, view, onClose, onDelete }: ListProps): ReactElement {
  const [renaming, setRenaming] = useState(false);
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
    <View aria-label="시간표 버전" role="list" style={styles.menu}>
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

// The trigger and, while open, the list. The card closes it on a press outside. While a change is on its way the
// trigger turns into a spinner and takes no press.
export function VersionMenu({ versions, open, onOpen }: MenuProps): ReactElement | null {
  const [deleting, setDeleting] = useState<string | null>(null);
  const { view } = versions;
  if (view === undefined) {
    return null;
  }
  const name = view.versions.find(({ id }) => id === view.currentId)?.name ?? '';
  return (
    <View style={styles.anchor}>
      <Trigger
        busy={versions.busy}
        name={name}
        onPress={() => {
          onOpen(!open);
        }}
        open={open}
      />
      {open ? (
        <VersionList
          onClose={() => {
            onOpen(false);
          }}
          onDelete={setDeleting}
          versions={versions}
          view={view}
        />
      ) : null}
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
    top: 24,
    right: 0,
    width: MENU_WIDTH,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 14,
    backgroundColor: color.surface,
    boxShadow: shadow.float,
    zIndex: 31,
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
