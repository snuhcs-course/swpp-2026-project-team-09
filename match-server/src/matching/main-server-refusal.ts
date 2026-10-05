// A refusal the main server names with a code, such as a Global Event that has started.
export class MainServerRefusal extends Error {
  constructor(readonly code: string) {
    super(`The main server refused with ${code}`);
  }
}
