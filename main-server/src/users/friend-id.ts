// AI-generated with Claude Fable 5.1, 2026-10-05, prompted by fyoon46, reviewed by TaeHyun79 in #38
import { randomInt } from 'node:crypto';

// Capital letters and digits without 0, O, 1, I and L, which are easily read one for another.
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const LENGTH = 8;

export function newFriendId(): string {
  return Array.from({ length: LENGTH }, () => ALPHABET.charAt(randomInt(ALPHABET.length))).join('');
}
