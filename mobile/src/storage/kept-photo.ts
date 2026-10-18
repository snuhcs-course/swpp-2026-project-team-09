/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { Directory, File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

// A photo the User picked for a Quest, copied out of the picker's cache, which the system may empty, into the app's
// documents. The web keeps the address it was given.
export async function keepPhoto(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    return uri;
  }
  const folder = new Directory(Paths.document, 'quest-photos');
  folder.create({ idempotent: true, intermediates: true });
  const picked = new File(uri);
  const kept = new File(folder, `${String(Date.now())}-${picked.name}`);
  await picked.copy(kept);
  return kept.uri;
}
