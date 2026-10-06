import type { Administrator, MainServer } from '@/main-server';
import type * as MainServerModule from '@/main-server';

// The setup file replaces '@/main-server' with this fake, so the real error class comes from the actual module.
const { MainServerError } = await vi.importActual<typeof MainServerModule>('@/main-server');

interface Account extends Administrator {
  tokens: Set<string>;
}

// Behaves like the main server's administrator routes, and records each request as "METHOD /path".
class FakeMainServer implements MainServer {
  requests: string[] = [];
  private accounts: Account[] = [];
  private issued = 0;

  reset(): void {
    this.requests = [];
    this.accounts = [];
  }

  hasAdministrators(...emails: string[]): void {
    for (const email of emails) {
      this.add(email);
    }
  }

  // Shaped like Google's: header, claims and signature.
  idTokenOf(email: string): string {
    return `e30.${Buffer.from(JSON.stringify({ email })).toString('base64url')}.signature`;
  }

  signedInAs(email: string): string {
    const account = this.accounts.find((each) => each.email === email);
    if (account === undefined) {
      throw new Error(`${email} is not registered`);
    }
    this.issued += 1;
    const token = `access-token-${this.issued}`;
    account.signedIn = true;
    account.tokens.add(token);
    return token;
  }

  signIn(idToken: string): Promise<{ accessToken: string }> {
    this.requests.push('POST /admin/auth/google');
    return new Promise((resolve) => {
      const email = this.accounts.map((each) => each.email).find((each) => this.idTokenOf(each) === idToken);
      if (!idToken.startsWith('e30.')) {
        throw new MainServerError(401);
      }
      if (email === undefined) {
        throw new MainServerError(403);
      }
      resolve({ accessToken: this.signedInAs(email) });
    });
  }

  signOut(token: string): Promise<void> {
    this.requests.push('POST /admin/auth/sign-out');
    return this.as(token, (account) => {
      account.tokens.clear();
    });
  }

  listAdministrators(token: string): Promise<Administrator[]> {
    this.requests.push('GET /admin/administrators');
    return this.as(token, () => this.accounts.map(toAdministrator).toSorted((a, b) => a.email.localeCompare(b.email)));
  }

  registerAdministrator(token: string, email: string): Promise<Administrator> {
    this.requests.push('POST /admin/administrators');
    return this.as(token, () => {
      const address = email.toLowerCase();
      return toAdministrator(this.accounts.find((each) => each.email === address) ?? this.add(address));
    });
  }

  removeAdministrator(token: string, id: string): Promise<void> {
    this.requests.push(`DELETE /admin/administrators/${id}`);
    return this.as(token, () => {
      if (!this.accounts.some((each) => each.id === id)) {
        throw new MainServerError(404);
      }
      if (this.accounts.length === 1) {
        throw new MainServerError(409);
      }
      this.accounts = this.accounts.filter((each) => each.id !== id);
    });
  }

  private add(email: string): Account {
    const account = { id: crypto.randomUUID(), email, signedIn: false, tokens: new Set<string>() };
    this.accounts.push(account);
    return account;
  }

  private as<T>(token: string, answer: (account: Account) => T): Promise<T> {
    return new Promise((resolve) => {
      const account = this.accounts.find((each) => each.tokens.has(token));
      if (account === undefined) {
        throw new MainServerError(401);
      }
      resolve(answer(account));
    });
  }
}

function toAdministrator({ id, email, signedIn }: Account): Administrator {
  return { id, email, signedIn };
}

export const fakeMainServer = new FakeMainServer();
