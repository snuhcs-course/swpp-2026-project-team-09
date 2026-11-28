/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type ReactElement, type Ref, useState } from 'react';
import { TextInput, type TextInputProps } from 'react-native';
import { NOT_AUTOFILLED } from './autofill';
import { cut } from './length';

// What no field of the app may set. On Android `autoCorrect={false}` sets TYPE_TEXT_FLAG_NO_SUGGESTIONS, and Samsung
// Keyboard then stops composing Hangul and types loose letters, 'ㅋㅓㅁ' for 컴. The autofill props are NOT_AUTOFILLED's.
type Fixed = 'autoCorrect' | 'autoComplete' | 'importantForAutofill' | 'textContentType';

export type TextEntryProps = Omit<TextInputProps, Fixed> & {
  ref?: Ref<TextInput>;
  // The most characters the field takes, counted as `lengthOf` counts them; what is typed or pasted beyond is dropped.
  most?: number;
  // Whether the field takes these words; when not, it keeps the words it had and its owner hears nothing.
  takes?: (text: string) => boolean;
};

// The words the field shows: what was just typed, until its owner gives other words. A field in a panel or a sheet
// gets its owner's new `value` one commit late, through the `OverlayHost`; React Native's TextInput would meanwhile
// send the old words to the native field, which drops the keyboard's composing on every key ('ㅋㅓㅁ' for 컴). So an
// owner takes the words it is given as they are: a limit on their length is `most`, and a refusal is `takes`.
function useTyped(
  value: string | undefined,
  onChangeText: ((text: string) => void) | undefined,
  { most, takes }: Pick<TextEntryProps, 'most' | 'takes'>,
): { shown: string | undefined; onChangeText: (text: string) => void } {
  const [typed, setTyped] = useState(value);
  const [given, setGiven] = useState(value);
  if (value !== given) {
    setGiven(value);
    setTyped(value);
  }
  return {
    shown: value === undefined ? undefined : typed,
    onChangeText: (text) => {
      if (takes?.(text) === false) {
        return;
      }
      const kept = most === undefined ? text : cut(text, most);
      setTyped(kept);
      onChangeText?.(kept);
    },
  };
}

// The one text input every typed field of the app is drawn with.
export function TextEntry({ ref, value, onChangeText, most, takes, ...props }: TextEntryProps): ReactElement {
  const typed = useTyped(value, onChangeText, { most, takes });
  return (
    <TextInput
      {...props}
      {...NOT_AUTOFILLED}
      autoCorrect={undefined}
      onChangeText={typed.onChangeText}
      ref={ref}
      value={typed.shown}
    />
  );
}
