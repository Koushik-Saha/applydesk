// CLAUDE.md conventions — route handlers return `{ error: { code, message } }`
// with the matching HTTP status; requireOwner/requireExtensionToken throw
// this so every caller converts it the same way.
export class AuthError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
