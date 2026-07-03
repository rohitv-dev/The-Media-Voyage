import type { ApiErrorResponse } from "@media-voyage/shared/api";

const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "http://localhost:3000/api/v1";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: ApiErrorResponse,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...init,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new ApiError(data.error ?? "Request failed", response.status, data);
  }

  return data as Promise<T>;
}
