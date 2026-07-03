export type ValidationErrorResponse = {
  success: false;
  type: "validation";
  error: string;
  details: string;
};

export type ServerErrorResponse = {
  success: false;
  type: "server";
  error: string;
};

export type ApiErrorResponse = ValidationErrorResponse | ServerErrorResponse;
