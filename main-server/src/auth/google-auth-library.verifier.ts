/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { Injectable } from '@nestjs/common';
import { gaxios, OAuth2Client, TokenPayload } from 'google-auth-library';
import { GoogleIdTokenVerifier } from './google-id-token.verifier.js';

// Verifies as Google's documentation describes, with Google's library and Google's public keys.
@Injectable()
export class GoogleAuthLibraryVerifier implements GoogleIdTokenVerifier {
  private readonly client = new OAuth2Client();

  async verify(idToken: string, audiences: readonly string[]): Promise<TokenPayload | undefined> {
    try {
      const ticket = await this.client.verifyIdToken({ idToken, audience: [...audiences] });
      return ticket.getPayload();
    } catch (error) {
      // Google's public keys could not be fetched: the token was not checked, so it is not refused.
      if (error instanceof gaxios.GaxiosError) {
        throw error;
      }
      return undefined;
    }
  }
}
