// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #48
// A refusal the main server names with a code, such as a Global Event that has started.
export class MainServerRefusal extends Error {
  constructor(readonly code: string) {
    super(`The main server refused with ${code}`);
  }
}
