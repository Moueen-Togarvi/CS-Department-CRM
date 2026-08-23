/**
 * Lives in its own module so both `auth.ts` and `auth-utils.ts` can throw it
 * without importing each other (auth-utils already depends on auth.ts).
 */
export class AuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number = 400) {
    super(message);
    this.name = "AuthError";
    this.statusCode = statusCode;
  }
}
