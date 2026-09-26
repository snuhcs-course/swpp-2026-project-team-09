export function classifyFinalization(status: number): { terminal: boolean; explanation: string } {
  if (status === 400 || status === 404) {
    return { terminal: true, explanation: `Matching cancelled: main rejected the group or its event (HTTP ${status}). No party was confirmed; review the event and submit a new request if appropriate.` };
  }
  if (status === 409) {
    return { terminal: true, explanation: 'Matching stopped because a request may already belong to a party. Check your existing parties before submitting another request; these request IDs will not be reused.' };
  }
  if (status === 401 || status === 403) {
    return { terminal: false, explanation: 'Party confirmation is unavailable because internal service authentication requires operator configuration. The same group is retained for retry; no party is confirmed yet.' };
  }
  return { terminal: false, explanation: `Party confirmation is uncertain or temporarily unavailable (HTTP ${status}). The same group is retained for idempotent retry; no party is confirmed yet.` };
}
