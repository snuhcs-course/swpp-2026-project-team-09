import {
  createContext,
  Fragment,
  type ReactElement,
  type ReactNode,
  use,
  useCallback,
  useId,
  useLayoutEffect,
  useState,
} from 'react';

type Put = (id: string, layer: ReactNode | null) => void;

const OverlayContext = createContext<Put | null>(null);

// Where side panels and bottom sheets are drawn: above every screen and the bottom navigation, and under the toast,
// so that a panel covers the whole screen as the frames draw it and a toast it shows stays in view. A Modal would
// hide the toast.
export function OverlayHost({ children }: { children: ReactNode }): ReactElement {
  const [layers, setLayers] = useState<ReadonlyMap<string, ReactNode>>(new Map());
  const put = useCallback<Put>((id, layer) => {
    setLayers((now) => {
      const next = new Map(now);
      if (layer === null) {
        next.delete(id);
      } else {
        next.set(id, layer);
      }
      return next;
    });
  }, []);
  return (
    <OverlayContext value={put}>
      {children}
      {[...layers].map(([id, layer]) => (
        <Fragment key={id}>{layer}</Fragment>
      ))}
    </OverlayContext>
  );
}

// Draws its children in the `OverlayHost` around the app, or where it stands without one, as in the catalogue.
export function Overlay({ children }: { children: ReactNode }): ReactElement | null {
  const put = use(OverlayContext);
  const id = useId();
  useLayoutEffect(() => {
    put?.(id, children);
  }, [put, id, children]);
  useLayoutEffect(
    () => (): void => {
      put?.(id, null);
    },
    [put, id],
  );
  return put === null ? <>{children}</> : null;
}
