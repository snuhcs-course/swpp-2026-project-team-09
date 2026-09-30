import { TokenPayload } from 'google-auth-library';

// Checks that Google issued an ID token to one of the given OAuth clients: its signature, issuer, audience and expiry.
// Returns the token's claims, or undefined when the token fails a check.
// AuthModule provides GoogleAuthLibraryVerifier. The tests replace it with a verifier that checks tokens signed with
// a test key (test/google.ts).
export abstract class GoogleIdTokenVerifier {
  abstract verify(idToken: string, audiences: readonly string[]): Promise<TokenPayload | undefined>;
}
