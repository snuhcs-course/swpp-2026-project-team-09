export const LOCATION_TTL_MS = 120_000;
export type SnapshotRequest = { generation: number; token: string };
export function canApplyLocations(
  request: SnapshotRequest,
  current: SnapshotRequest & { sharing: boolean; active: boolean },
) {
  return (
    Boolean(request.token) &&
    request.token === current.token &&
    request.generation === current.generation &&
    current.sharing &&
    current.active
  );
}
export function freshLocations<T extends { observedAt: string }>(
  items: T[],
  now = Date.now(),
): T[] {
  return items.filter((item) => {
    const age = now - Date.parse(item.observedAt);
    return Number.isFinite(age) && age >= 0 && age < LOCATION_TTL_MS;
  });
}
