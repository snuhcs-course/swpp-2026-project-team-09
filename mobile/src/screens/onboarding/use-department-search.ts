import { type RefObject, useEffect, useRef, useState } from 'react';
import type { TextInput } from 'react-native';

// How long the list stays after the field lost the focus. On the web and on Android a press on a row takes the
// focus from the field before it is a press, so the list waits for it.
const CLOSE_AFTER_MS = 250;

interface Search {
  open: boolean;
  // What the User typed to narrow the list. It is a search and never the department.
  words: string;
  input: RefObject<TextInput | null>;
  begin: () => void;
  type: (typed: string) => void;
  choose: (department: string) => void;
  clear: () => void;
  // The field lost the focus: without a choice the list closes, and the field shows the department it held.
  leave: () => void;
  // A press on a row began, and ended.
  hold: () => void;
  release: () => void;
}

// A close that waits, and can be called off.
function useLater(act: () => void): { soon: () => void; stay: () => void } {
  const waiting = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stay = (): void => {
    if (waiting.current !== null) {
      clearTimeout(waiting.current);
      waiting.current = null;
    }
  };
  useEffect(() => stay, []);
  return {
    stay,
    soon: () => {
      stay();
      waiting.current = setTimeout(act, CLOSE_AFTER_MS);
    },
  };
}

// The department's search: the list opens with the focus, what is typed narrows it, a press chooses and closes it,
// and leaving the field closes it with the department as it was.
export function useDepartmentSearch(onChange: (department: string) => void): Search {
  const [open, setOpen] = useState(false);
  const [words, setWords] = useState('');
  const input = useRef<TextInput>(null);
  const focused = useRef(false);
  const set = (shown: boolean, typed: string): void => {
    setOpen(shown);
    setWords(typed);
  };
  const close = useLater(() => {
    if (!focused.current) {
      set(false, '');
    }
  });
  const show = (typed: string): void => {
    close.stay();
    set(true, typed);
  };
  return {
    open,
    words,
    input,
    begin: () => {
      focused.current = true;
      show('');
    },
    type: show,
    choose: (department) => {
      onChange(department);
      close.stay();
      set(false, '');
      input.current?.blur();
    },
    clear: () => {
      onChange('');
      show('');
      input.current?.focus();
    },
    leave: () => {
      focused.current = false;
      close.soon();
    },
    hold: close.stay,
    release: () => {
      if (!focused.current) {
        close.soon();
      }
    },
  };
}
