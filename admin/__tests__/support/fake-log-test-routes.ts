/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type * as MainServerModule from '@/main-server';

import { SettingsRoutes } from './fake-settings-routes';

const { MainServerError } = await vi.importActual<typeof MainServerModule>('@/main-server');

// The main server's test log line, apart from the fake's other routes.
export abstract class LogTestRoutes extends SettingsRoutes {
  // Each test log line asked for, with the token it came with.
  testLines: { token: string; level: string }[] = [];
  private testLineRefusal: Error | undefined;

  refusesTestLines(status: number, message: string): void {
    this.testLineRefusal = new MainServerError(status, { message });
  }

  protected resetTestLines(): void {
    this.testLines = [];
    this.testLineRefusal = undefined;
  }

  writeTestLine = (token: string, level: string): Promise<void> =>
    this.answer('POST /admin/log-test', token, () => {
      if (this.testLineRefusal !== undefined) {
        throw this.testLineRefusal;
      }
      this.testLines.push({ token, level });
    });
}
