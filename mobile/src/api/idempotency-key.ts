// A fresh Idempotency-Key: a random UUID of version 4. The phone has no crypto module for it, and the key needs only
// to differ from the User's other keys.
export function newIdempotencyKey(): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16));
  hex[12] = '4';
  hex[16] = ((Number.parseInt(hex[16] ?? '0', 16) % 4) + 8).toString(16);
  const all = hex.join('');
  return `${all.slice(0, 8)}-${all.slice(8, 12)}-${all.slice(12, 16)}-${all.slice(16, 20)}-${all.slice(20)}`;
}
