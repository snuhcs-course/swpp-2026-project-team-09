// What a hook of a feature tells a screen.
export interface ScreenData<View> {
  // Undefined while it is loading, and where a failure leaves nothing to show.
  data: View | undefined;
  isPending: boolean;
  isError: boolean;
  // Asks again the operations that failed, or all of them when none failed.
  refetch: () => void;
}

// The part of one operation's state that the hooks combine.
export interface Asked {
  isPending: boolean;
  isError: boolean;
  refetch: () => unknown;
}

export function somePending(asked: readonly Asked[]): boolean {
  return asked.some(({ isPending }) => isPending);
}

export function someFailed(asked: readonly Asked[]): boolean {
  return asked.some(({ isError }) => isError);
}

export function askAgain(asked: readonly Asked[]): () => void {
  return () => {
    const failed = asked.filter(({ isError }) => isError);
    for (const { refetch } of failed.length === 0 ? asked : failed) {
      refetch();
    }
  };
}
