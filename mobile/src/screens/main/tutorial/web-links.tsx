/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { openBrowserAsync } from 'expo-web-browser';
import { type ReactElement, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { TutorialLink } from '@/api/tutorial-types';
import { color, font, Icon, radius, shadow, size, space, tutorialTone } from '@/design-system';

const BUTTON = 40;
const CARD_WIDTH = 250;

// Opens a site in the phone's browser; a failure to open leaves the screen as it is. Only a web address opens.
export function openSite(url: string): void {
  if (/^https?:\/\//iu.test(url)) {
    void openBrowserAsync(url).catch(() => null);
  }
}

// 🌐 of a Tutorial Quest's sheet and of its guide's bar ("링크는 🌐"): a press opens a small card of the quest's links
// under it, each opening its site; a second press closes it. Nothing for a quest without links.
export function WebLinks({ links }: { links: readonly TutorialLink[] }): ReactElement | null {
  const [open, setOpen] = useState(false);
  if (links.length === 0) {
    return null;
  }
  return (
    <View style={styles.anchor}>
      <Pressable
        accessibilityLabel="외부 사이트 링크"
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        hitSlop={(size.touchMin - BUTTON) / 2}
        onPress={() => {
          setOpen((shown) => !shown);
        }}
        style={[styles.button, open && styles.buttonOpen]}
      >
        <Icon color={color.snuBlue} name="globe" size={22} />
      </Pressable>
      {open ? (
        <View accessibilityLabel="외부 사이트" style={styles.card}>
          {links.map(({ label, url }) => (
            <Pressable
              accessibilityLabel={`${label} 열기 (외부 사이트)`}
              accessibilityRole="link"
              key={url}
              onPress={() => {
                setOpen(false);
                openSite(url);
              }}
              style={styles.link}
            >
              <Icon color={color.snuBlue} name="globe" size={18} />
              <Text style={styles.linkWords}>{label}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  anchor: { zIndex: 20 },
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    width: BUTTON,
    height: BUTTON,
    borderRadius: radius.md,
  },
  buttonOpen: { backgroundColor: color.blue50 },
  card: {
    position: 'absolute',
    top: BUTTON + space[1],
    right: -6,
    zIndex: 20,
    width: CARD_WIDTH,
    gap: 6,
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: color.surface,
    boxShadow: shadow.mapCard,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 44,
    paddingHorizontal: 10,
    borderRadius: radius.md,
    backgroundColor: tutorialTone.rowsGround,
  },
  linkWords: { flex: 1, fontFamily: font.bold, fontSize: 14, lineHeight: 20, color: color.ink },
});
