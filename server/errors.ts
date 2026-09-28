export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public extra: Record<string, unknown> = {}
  ) {
    super(message);
  }
  toJSON() {
    return {
      error: { code: this.code, message: this.message, ...this.extra },
    };
  }
}

export const badRequest = (msg: string, extra: Record<string, unknown> = {}) =>
  new HttpError(400, "bad_request", msg, extra);
export const unauthorised = (msg = "Sign-in required") =>
  new HttpError(401, "unauthorised", msg);
export const forbidden = (msg = "Not permitted") =>
  new HttpError(403, "forbidden", msg);
export const notFound = (msg = "Not found") =>
  new HttpError(404, "not_found", msg);
export const conflict = (msg: string) => new HttpError(409, "conflict", msg);
export const unprocessable = (
  code: string,
  msg: string,
  extra: Record<string, unknown> = {}
) => new HttpError(422, code, msg, extra);
