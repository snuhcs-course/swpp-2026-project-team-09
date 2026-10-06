// What the tests' notFound() throws, as Next.js's own throws to show the not-found page.
export class NotFound extends Error {
  constructor() {
    super('Not found');
  }
}
