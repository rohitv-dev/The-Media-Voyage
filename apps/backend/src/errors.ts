export type AppErrorType =
  | "authentication"
  | "authorization"
  | "bad_request"
  | "conflict"
  | "not_found"
  | "provider"
  | "server";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly type: AppErrorType = getErrorType(statusCode),
    public readonly details?: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = "AppError";
  }
}

function getErrorType(statusCode: number): AppErrorType {
  if (statusCode === 401) return "authentication";
  if (statusCode === 403) return "authorization";
  if (statusCode === 400) return "bad_request";
  if (statusCode === 404) return "not_found";
  if (statusCode === 409) return "conflict";
  return "server";
}

export function unauthorized(message = "Authentication required") {
  return new AppError(401, "UNAUTHORIZED", message);
}

export function badRequest(message: string) {
  return new AppError(400, "BAD_REQUEST", message);
}

export function forbidden(message = "You do not have access to this resource") {
  return new AppError(403, "FORBIDDEN", message);
}

export function notFound(message = "Not found") {
  return new AppError(404, "NOT_FOUND", message);
}

export function conflict(message: string) {
  return new AppError(409, "CONFLICT", message);
}

export function internalServerError(
  message = "Internal server error",
  options?: ErrorOptions,
) {
  return new AppError(
    500,
    "INTERNAL_SERVER_ERROR",
    message,
    "server",
    undefined,
    options,
  );
}
