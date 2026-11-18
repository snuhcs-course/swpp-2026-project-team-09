/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

// The login's checks (P15 ticket 57), which outlive the login view: the site serves its main page before the school's
// login too, so a check may still run when the User is back logged in, or when they close the view. One check runs at a
// time. A landing on the site's screens that comes while one runs is kept, and closing the view while one runs keeps
// one more; when the running check finds no session, the one kept is made, once. A check that finds the session sets
// the flag whether or not the view is still open, so that closing the view never throws a login away. Every check ends
// with `checking` false, and once cancelled (a logout, a sign-out) or stopped (the provider gone) none starts and the
// result of the one under way is not used. A check reloads the hidden page, which goes to the school's login in the
// cookie jar the visible view shares; so the one kept waits while the view is away from the site's screens (the User
// in the middle of the school's login), and is made on the next landing or on close.

export interface LoginCheckHooks {
  setChecking: (checking: boolean) => void;
  // One check: whether the session works (`loginWorks` on a page loaded afresh).
  check: () => Promise<boolean>;
  // Sets the "logged in" flag; true once it is set.
  markLoggedIn: () => Promise<boolean>;
  // A check found the session and the flag is set.
  onSession: () => void;
  // The checks ended without a session and none is kept: what the view's close said can be said now.
  onNoSession: () => void;
}

export class LoginChecks {
  hooks: LoginCheckHooks;
  private running = false;
  private again = false;
  private round = 0;
  private alive = true;
  // The view is away from the site's screens.
  private away = false;
  // The view closed while a check ran or one was kept: its outcome waits for them.
  private closing = false;

  constructor(hooks: LoginCheckHooks) {
    this.hooks = hooks;
  }

  // The login view landed on the site's main, booking or my-booking screen.
  landed(): void {
    this.away = false;
    if (!this.alive) {
      return;
    }
    if (this.running) {
      this.again = true;
      return;
    }
    void this.run();
  }

  // The view went to a page off the site's screens.
  left(): void {
    this.away = true;
  }

  // The view closed without a session. A check under way is followed by one last check, and one kept is made now.
  // True when a check is still to come, and the view's outcome is to wait for `onSession` or `onNoSession`.
  closed(): boolean {
    this.away = false;
    if (!this.alive) {
      return false;
    }
    if (this.running) {
      this.again = true;
    } else if (this.again) {
      void this.run();
    }
    this.closing = this.running;
    return this.closing;
  }

  // The provider is (again) in use, as after a Fast Refresh that stopped it.
  start(): void {
    this.alive = true;
  }

  // The session was ended on purpose: the check under way is not used, and the one kept is dropped.
  cancel(): void {
    this.round += 1;
    this.again = false;
  }

  private settle(session: boolean): void {
    const closing = this.closing;
    this.closing = false;
    if (session) {
      this.hooks.onSession();
    } else if (closing) {
      this.hooks.onNoSession();
    }
  }

  stop(): void {
    this.alive = false;
    this.cancel();
  }

  private async run(): Promise<void> {
    this.running = true;
    this.again = false;
    const round = this.round;
    this.hooks.setChecking(true);
    const works = await this.hooks.check().catch(() => false);
    const used = (): boolean => this.alive && round === this.round;
    const session = used() && works && (await this.hooks.markLoggedIn().catch(() => false));
    this.running = false;
    if (!this.alive) {
      return;
    }
    if (used() && !session && this.again && !this.away) {
      void this.run();
      return;
    }
    this.hooks.setChecking(false);
    if (session || !this.again || !used()) {
      this.again = false;
      this.settle(session);
    }
  }
}
