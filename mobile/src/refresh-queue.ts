/** Coalesce invalidation hints; at most one refresh and one trailing batch. */
export function createRefreshQueue(
  refresh: () => Promise<unknown>,
  onError: (error: unknown) => void,
  delayMs = 120,
) {
  let disposed = false;
  let dirty = false;
  let running = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function schedule() {
    if (disposed || running || timer !== undefined) return;
    timer = setTimeout(() => {
      timer = undefined;
      void flush();
    }, delayMs);
  }
  async function flush() {
    if (disposed || running || !dirty) return;
    dirty = false;
    running = true;
    try {
      await refresh();
    } catch (error) {
      if (!disposed) onError(error);
    } finally {
      running = false;
      if (dirty) schedule();
    }
  }
  return {
    request() {
      if (disposed) return;
      dirty = true;
      schedule();
    },
    dispose() {
      disposed = true;
      dirty = false;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
    },
  };
}
