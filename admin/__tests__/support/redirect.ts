// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
// What the tests' redirect() throws, as Next.js's own throws to end a render or a Server Action.
export class Redirect extends Error {
  constructor(readonly location: string) {
    super(`Redirected to ${location}`);
  }
}
