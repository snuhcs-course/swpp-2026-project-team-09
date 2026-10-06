// What the tests' redirect() throws, as Next.js's own throws to end a render or a Server Action.
export class Redirect extends Error {
  constructor(readonly location: string) {
    super(`Redirected to ${location}`);
  }
}
