/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-17  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { useCallback } from 'react';
import { Keyboard } from 'react-native';
import { useToast } from '@/design-system';
import type { Chat } from '@/features/assistant/use-chat';

export const FORGOTTEN = '대화를 지웠어요';
export const UNDO = '되돌리기';
// Long enough to read the words and reach 되돌리기.
const FORGOTTEN_MS = 5000;

// "새 대화": forgets the conversation at one press, and a toast offers 되돌리기, which brings every turn back while
// the toast shows and nothing new was said.
export function useForgetWithUndo(reset: Chat['reset']): () => void {
  const showToast = useToast();
  return useCallback((): void => {
    Keyboard.dismiss();
    const undo = reset();
    showToast(FORGOTTEN, FORGOTTEN_MS, 'check', { label: UNDO, onPress: undo });
  }, [reset, showToast]);
}
