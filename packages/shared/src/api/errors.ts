export type ValidationErrorResponse = {
  success: false;
  type: "validation";
  code: "VALIDATION_ERROR";
  error: string;
  details: string;
  requestId?: string;
};

export type ServerErrorResponse = {
  success: false;
  type:
    | "authentication"
    | "authorization"
    | "bad_request"
    | "conflict"
    | "not_found"
    | "provider"
    | "server";
  code: string;
  error: string;
  details?: string;
  requestId?: string;
};

export type ApiErrorResponse = ValidationErrorResponse | ServerErrorResponse;
