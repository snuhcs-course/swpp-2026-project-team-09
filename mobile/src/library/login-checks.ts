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
// result of the one under way is not used.

export interface LoginCheckHooks {
  setChecking: (checking: boolean) => void;
  // One check: whether the session works (`loginWorks` on a page loaded afresh).
  check: () => Promise<boolean>;
  // Sets the "logged in" flag; true once it is set.
  markLoggedIn: () => Promise<boolean>;
  // A check found the session and the flag is set.
  onSession: () => void;
}

export class LoginChecks {
  hooks: LoginCheckHooks;
  private running = false;
  private again = false;
  private round = 0;
  private alive = true;

  constructor(hooks: LoginCheckHooks) {
    this.hooks = hooks;
  }

  // The login view landed on the site's main, booking or my-booking screen.
  landed(): void {
    if (!this.alive) {
      return;
    }
    if (this.running) {
      this.again = true;
      return;
    }
    void this.run();
  }

  // The view closed without a session: a check under way is followed by one last check.
  closed(): void {
    if (this.running) {
      this.again = true;
    }
  }

  // The session was ended on purpose: the check under way is not used, and the one kept is dropped.
  cancel(): void {
    this.round += 1;
    this.again = false;
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
    if (used() && !session && this.again) {
      void this.run();
      return;
    }
    this.hooks.setChecking(false);
    if (used() && session) {
      this.hooks.onSession();
    }
  }
}
