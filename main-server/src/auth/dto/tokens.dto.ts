// The answer to a sign-in. The access token goes in the Authorization header as `Bearer <token>`.
export interface TokensDto {
  accessToken: string;
  refreshToken: string;
}
