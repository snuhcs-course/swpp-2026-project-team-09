/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { File, Paths } from 'expo-file-system';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { type ReactElement, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, color, space, text } from '@/design-system';
import { type NativeOcrResult, readImageText } from '@/features/timetable-ocr/native-ocr';

type Check =
  | { kind: 'idle' }
  | { kind: 'reading'; uri: string }
  | { kind: 'read'; uri: string; result: NativeOcrResult; savedTo: string; ms: number }
  | { kind: 'failed'; message: string };

// The name of the saved file: the one asked for, or the time of the reading.
function fileName(name: string | undefined): string {
  const base = name !== undefined && /^[\w.-]+$/u.test(name) ? name : `ocr-${Date.now()}`;
  return `${base}.json`;
}

// Runs the native module on one image and saves its whole answer in the app's documents folder, where
// `adb exec-out run-as com.bonnieandclaude.snunow cat files/<name>.json` reads it.
async function check(uri: string, name: string | undefined): Promise<Check> {
  const started = Date.now();
  const reading = await readImageText(uri);
  const ms = Date.now() - started;
  if (reading.kind === 'unavailable') {
    return { kind: 'failed', message: '이 빌드에는 OCR 모듈이 없어요 (Expo Go, 웹)' };
  }
  if (reading.kind === 'failed') {
    return { kind: 'failed', message: reading.message };
  }
  const file = new File(Paths.document, fileName(name));
  file.create({ overwrite: true });
  file.write(JSON.stringify(reading.result));
  return { kind: 'read', uri, result: reading.result, savedTo: file.uri, ms };
}

function Summary({ check: done }: { check: Extract<Check, { kind: 'read' }> }): ReactElement {
  const { result } = done;
  const elements = result.lines.reduce((sum, line) => sum + line.elements.length, 0);
  return (
    <View style={styles.summary}>
      <Text style={styles.line}>
        {`이미지 ${result.width}×${result.height} · 줄 ${result.lines.length}개 · 단어 ${elements}개 · ${done.ms} ms`}
      </Text>
      <Text style={styles.line}>
        {`축소본 ${result.pixels.width}×${result.pixels.height} · 배율 ${result.pixels.scale.toFixed(3)}`}
      </Text>
      <Text style={styles.line}>{`저장: ${done.savedTo}`}</Text>
      {result.lines.map((line, index) => (
        <Text key={index} style={styles.ocrLine}>
          {`${line.text}  (${line.box.x},${line.box.y} ${line.box.w}×${line.box.h}` +
            `${line.confidence === null ? '' : ` · ${line.confidence.toFixed(2)}`})`}
        </Text>
      ))}
    </View>
  );
}

// The development screen of the native OCR module: picks an image from the album, or takes the one the address
// names (`snunow://ocr-check?uri=file:///…&name=snutt-1`), reads it and saves the module's answer as JSON.
export function OcrCheckScreen({ uri, name }: { uri?: string; name?: string }): ReactElement {
  const [state, setState] = useState<Check>({ kind: 'idle' });

  const run = (picked: string): void => {
    setState({ kind: 'reading', uri: picked });
    void check(picked, name).then(setState);
  };

  // The image the address names is read as soon as the screen opens.
  useEffect(() => {
    if (uri === undefined) {
      return;
    }
    setState({ kind: 'reading', uri });
    void check(uri, name).then(setState);
  }, [uri, name]);

  const pick = async (): Promise<void> => {
    const picked = await launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: false, quality: 1 });
    const asset = picked.canceled ? undefined : picked.assets[0];
    if (asset !== undefined) {
      run(asset.uri);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>OCR 확인</Text>
        <Button onPress={() => void pick()} variant="primary" disabled={state.kind === 'reading'}>
          사진 고르기
        </Button>
        {state.kind === 'reading' && <Text style={styles.line}>{`읽는 중: ${state.uri}`}</Text>}
        {state.kind === 'failed' && <Text style={styles.line}>{`실패: ${state.message}`}</Text>}
        {state.kind === 'read' && <Summary check={state} />}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.surface },
  content: { padding: space[4], gap: space[3] },
  title: { ...text.title, color: color.ink },
  summary: { gap: space[1] },
  line: { ...text.body, color: color.ink },
  ocrLine: { ...text.caption, color: color.inkMuted },
});
