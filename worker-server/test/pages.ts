// AI-generated with Claude Opus 5.5, 2026-10-02 to 2026-10-04, prompted by TaeHyun79, reviewed by fyoon46 in #26 #31
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// A page as it was served, saved once in test/pages/. The tests never call a real Source.
export function savedPage(name: string): string {
  return readFileSync(fileURLToPath(new URL(`pages/${name}.html`, import.meta.url)), 'utf8');
}

// A JSON answer as it was served, saved the same way.
export function savedAnswer(name: string): string {
  return readFileSync(fileURLToPath(new URL(`pages/${name}.json`, import.meta.url)), 'utf8');
}

// What the university's firewall answers a blocked request with, under status 200, as external-sources.md, 2 describes
// it. None was saved.
export const blockPage =
  '<html><head><meta http-equiv="refresh" content="0; url=https://snucert.snu.ac.kr/waf/error.html"></head></html>';
