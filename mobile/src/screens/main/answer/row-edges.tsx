/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  createContext,
  type ReactElement,
  type ReactNode,
  type RefObject,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  type HostInstance,
  StyleSheet,
  Text,
  type TextProps,
  useWindowDimensions,
  View,
  type ViewProps,
} from 'react-native';
import { type RowEdge, wholeCutsOf } from './card-caps';

// The rows of the answer card's content, as they are laid out (P01 ticket 32): each part that stands as a row (lines
// of words, a ticket, a list's row, a row of buttons or chips) tells where it is, so that the card's low step ends on a
// row's edge and never shows one cut in half (`card-caps.ts`). Outside the card nothing is told.

interface Registry {
  // The content's parts, which places are measured from.
  root: RefObject<View | null>;
  set: (key: string, edge: RowEdge | null) => void;
}

const RowEdges = createContext<Registry | null>(null);

function same(one: RowEdge | undefined, other: RowEdge | null): boolean {
  if (other === null) {
    return one === undefined;
  }
  return one !== undefined && one.top === other.top && one.bottom === other.bottom && one.line === other.line;
}

// The card's registry of rows, and the places its content may end at, from the content's top (under `padTop`), in
// order.
export function useRowEdgeRegistry(padTop: number): {
  root: RefObject<View | null>;
  registry: Registry;
  cuts: readonly number[];
} {
  const root = useRef<View | null>(null);
  const edges = useRef(new Map<string, RowEdge>());
  const [cuts, setCuts] = useState<readonly number[]>([]);
  const set = useCallback(
    (key: string, edge: RowEdge | null): void => {
      if (same(edges.current.get(key), edge)) {
        return;
      }
      if (edge === null) {
        edges.current.delete(key);
      } else {
        edges.current.set(key, edge);
      }
      const rows = [...edges.current.values()].map(({ top, bottom, line }) => ({
        top: top + padTop,
        bottom: bottom + padTop,
        line,
      }));
      const next = wholeCutsOf(rows);
      setCuts((was) => (was.length === next.length && was.every((cut, at) => cut === next[at]) ? was : next));
    },
    [padTop],
  );
  const registry = useMemo(() => ({ root, set }), [set]);
  return { root, registry, cuts };
}

export function RowEdgesProvider({ registry, children }: { registry: Registry; children: ReactNode }): ReactElement {
  return <RowEdges value={registry}>{children}</RowEdges>;
}

// A part that stands as a row tells its place each time it is laid out, and takes it away when it leaves. `line`, for
// lines of words, is each line's height: the content may end after any of them.
export function useRowEdge<T extends Pick<HostInstance, 'measureLayout'> = HostInstance>(
  line: number | null = null,
): { ref: RefObject<T | null>; onLayout: () => void } {
  const registry = use(RowEdges);
  const key = useId();
  const ref = useRef<T | null>(null);
  useEffect(
    () => (): void => {
      registry?.set(key, null);
    },
    [registry, key],
  );
  const onLayout = useCallback((): void => {
    const root = registry?.root.current ?? null;
    const node = ref.current;
    if (registry === null || root === null || node === null) {
      return;
    }
    node.measureLayout(
      root,
      (_x, y, _width, height) => {
        registry.set(key, height <= 0 ? null : { top: y, bottom: y + height, line });
      },
      () => {
        registry.set(key, null);
      },
    );
  }, [registry, key, line]);
  return { ref, onLayout };
}

// Lines of words that may end the low step after any of their lines: a `Text` that tells its place, each line its
// style's line height.
export function EdgeText(props: TextProps): ReactElement {
  const lineHeight = StyleSheet.flatten(props.style)?.lineHeight ?? null;
  const { fontScale } = useWindowDimensions();
  const { ref, onLayout } = useRowEdge<Text>(lineHeight === null ? null : lineHeight * fontScale);
  return (
    <Text
      {...props}
      onLayout={(event) => {
        onLayout();
        props.onLayout?.(event);
      }}
      ref={ref}
    />
  );
}

// A row the low step shows whole or not at all: a `View` that tells its place.
export function EdgeView(props: ViewProps): ReactElement {
  const { ref, onLayout } = useRowEdge<View>();
  return (
    <View
      {...props}
      onLayout={(event) => {
        onLayout();
        props.onLayout?.(event);
      }}
      ref={ref}
    />
  );
}
