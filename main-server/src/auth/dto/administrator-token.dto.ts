// The answer to an Administrator's sign-in: an access token without a refresh token. It goes in the Authorization
// header as `Bearer <token>`.
export interface AdministratorTokenDto {
  accessToken: string;
}
