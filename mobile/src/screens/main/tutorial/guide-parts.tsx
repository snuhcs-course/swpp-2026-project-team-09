/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Fragment, type ReactElement } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TutorialAction, TutorialChip, TutorialRow, TutorialSpot } from '@/api/tutorial-types';
import {
  color,
  font,
  Icon,
  iconOrFlag,
  type IconName,
  radius,
  space,
  type TutorialCategoryTone,
  tutorialTone,
} from '@/design-system';
import { openSite } from './web-links';

// The parts of a guide's bubble (the canvas's `MainTut*` boards): the paragraphs, the online step's rows, the chips,
// the spots' chips, the link button and the step's buttons.

const NUMBER = 22;

// Paragraphs over a step, a line under them.
export function About({ paragraphs }: { paragraphs: readonly string[] }): ReactElement {
  return (
    <View style={styles.about}>
      {paragraphs.map((paragraph) => (
        <Text key={paragraph} style={styles.aboutWords}>
          {paragraph}
        </Text>
      ))}
    </View>
  );
}

function RowLine({
  row,
  at,
  last,
  tone,
}: {
  row: TutorialRow;
  at: number;
  last: boolean;
  tone: TutorialCategoryTone;
}): ReactElement {
  const { url } = row;
  const words = (
    <>
      <Text style={[styles.number, last ? { backgroundColor: tone.ink, color: color.onPrimary } : styles.numberIdle]}>
        {String(at + 1)}
      </Text>
      {url === undefined ? null : <Icon color={tutorialTone.link} name="web" size={16} />}
      <Text style={[styles.rowWords, url !== undefined && styles.rowLink]}>{row.words}</Text>
      {row.note === undefined ? null : (
        <Text style={[styles.note, { backgroundColor: tone.soft, color: tone.ink }]}>{row.note}</Text>
      )}
    </>
  );
  const look = [styles.row, last ? { borderWidth: 2, borderColor: tone.ink } : styles.rowIdle];
  return url === undefined ? (
    <View style={look}>{words}</View>
  ) : (
    <Pressable
      accessibilityLabel={`${row.words} (외부 사이트)`}
      accessibilityRole="link"
      onPress={() => {
        openSite(url);
      }}
      style={look}
    >
      {words}
    </Pressable>
  );
}

// An online step: each press in order, numbered, joined by a line; the last one outlined.
export function Rows({ rows, tone }: { rows: readonly TutorialRow[]; tone: TutorialCategoryTone }): ReactElement {
  return (
    <View accessibilityLabel="누르는 순서" style={styles.rows}>
      {rows.map((row, at) => (
        <Fragment key={`${row.words}-${String(at)}`}>
          {at === 0 ? null : <View style={styles.joint} />}
          <RowLine at={at} last={at === rows.length - 1} row={row} tone={tone} />
        </Fragment>
      ))}
    </View>
  );
}

export function Chips({ chips }: { chips: readonly TutorialChip[] }): ReactElement {
  return (
    <View style={styles.wrap}>
      {chips.map(({ icon, words }) => (
        <View key={`${icon}-${words}`} style={styles.chip}>
          <Icon color={color.inkMuted} name={iconOrFlag(icon)} size={15} />
          <Text style={styles.chipWords}>{words}</Text>
        </View>
      ))}
    </View>
  );
}

interface SpotsProps {
  spots: readonly TutorialSpot[];
  shown: number;
  tone: TutorialCategoryTone;
  onPick: (spot: number) => void;
}

// The places of a step with several: a chip each, the shown one filled; a dashed one has no pin on the map.
export function Spots({ spots, shown, tone, onPick }: SpotsProps): ReactElement {
  return (
    <View accessibilityLabel="장소" style={styles.wrap}>
      {spots.map((spot, at) => {
        const on = at === shown;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            key={spot.name}
            onPress={() => {
              onPick(at);
            }}
            style={[
              styles.spot,
              on
                ? { backgroundColor: tone.ink }
                : {
                    backgroundColor: tone.soft,
                    borderWidth: 1,
                    borderColor: `${tone.ink}66`,
                    borderStyle: spot.place === undefined ? 'dashed' : 'solid',
                  },
            ]}
          >
            <Text style={[styles.spotWords, { color: on ? color.onPrimary : tone.ink }]}>{spot.name}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// "my.snu.ac.kr" of "https://my.snu.ac.kr/…".
function hostOf(url: string): string {
  return url.replace(/^https?:\/\//u, '').split('/')[0] ?? url;
}

// The big link of a step done on a site, with the site's host at its right.
export function LinkButton({ words, url }: { words: string; url: string }): ReactElement {
  return (
    <Pressable
      accessibilityLabel={`${words} (외부 사이트)`}
      accessibilityRole="link"
      onPress={() => {
        openSite(url);
      }}
      style={styles.link}
    >
      <Icon color={color.snuBlue} name="web" size={20} />
      <Text style={styles.linkWords}>{words}</Text>
      <Text style={styles.linkHost}>{hostOf(url)}</Text>
    </Pressable>
  );
}

const ACTION_ICON: Record<TutorialAction['kind'], IconName> = { route: 'route', link: 'web', ask: 'spark' };

interface ActionsProps {
  actions: readonly TutorialAction[];
  tone: TutorialCategoryTone;
  onRoute: () => void;
  onAsk: (words: string) => void;
}

// The step's buttons side by side: 길찾기 and the Assistant's in the category's colours, a site's in navy.
export function Actions({ actions, tone, onRoute, onAsk }: ActionsProps): ReactElement {
  return (
    <View style={styles.actions}>
      {actions.map((action) => {
        const site = action.kind === 'link';
        const ink = site ? color.onPrimary : tone.ink;
        return (
          <Pressable
            accessibilityLabel={site ? `${action.words} (외부 사이트)` : action.words}
            accessibilityRole="button"
            key={`${action.kind}-${action.words}`}
            onPress={() => {
              if (action.kind === 'link') {
                openSite(action.url);
              } else if (action.kind === 'ask') {
                onAsk(action.ask);
              } else {
                onRoute();
              }
            }}
            style={[
              styles.action,
              site ? styles.actionSite : { borderWidth: 1, borderColor: tone.ink, backgroundColor: tone.soft },
            ]}
          >
            <Icon color={ink} name={ACTION_ICON[action.kind]} size={18} />
            <Text style={[styles.actionWords, { color: ink }]}>{action.words}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  about: { gap: 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: tutorialTone.idle },
  aboutWords: { fontFamily: font.medium, fontSize: 14, lineHeight: 21, color: color.inkMuted },
  rows: { padding: 10, borderRadius: 14, backgroundColor: tutorialTone.rowsGround },
  joint: { width: 2, height: space[2], marginLeft: 15, backgroundColor: tutorialTone.rowsLine },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    height: 34,
    paddingRight: 10,
    paddingLeft: 6,
    borderRadius: 10,
    backgroundColor: color.surface,
  },
  rowIdle: { boxShadow: '0 1px 2px rgba(14, 19, 48, 0.08)' },
  number: {
    overflow: 'hidden',
    width: NUMBER,
    height: NUMBER,
    borderRadius: 7,
    fontFamily: font.bold,
    fontSize: 11,
    lineHeight: NUMBER,
    textAlign: 'center',
  },
  numberIdle: { backgroundColor: tutorialTone.idle, color: color.inkMuted },
  rowWords: { flex: 1, fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: color.ink },
  rowLink: { color: tutorialTone.link, textDecorationLine: 'underline' },
  note: {
    overflow: 'hidden',
    paddingVertical: 2,
    paddingHorizontal: space[2],
    borderRadius: radius.full,
    fontFamily: font.bold,
    fontSize: 11,
    lineHeight: 16,
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 30,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: 10,
    backgroundColor: color.surface,
  },
  chipWords: { fontFamily: font.semiBold, fontSize: 13, lineHeight: 18, color: color.inkMuted },
  spot: { justifyContent: 'center', height: 30, paddingHorizontal: 10, borderRadius: radius.full },
  spotWords: { fontFamily: font.bold, fontSize: 13, lineHeight: 18 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    minHeight: 48,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: color.focusRing,
    borderRadius: 14,
    backgroundColor: color.blue50,
  },
  linkWords: { flex: 1, fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: color.snuBlue },
  linkHost: { fontFamily: font.semiBold, fontSize: 12, lineHeight: 16, color: color.focusRing },
  actions: { flexDirection: 'row', gap: space[2] },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: radius.md,
  },
  actionSite: { backgroundColor: color.snuBlue },
  actionWords: { fontFamily: font.bold, fontSize: 15, lineHeight: 22 },
});
