import type { ApiErrorResponse } from "@media-voyage/shared/api";
import { frontendConfig } from "../config";

const API_BASE_URL = frontendConfig.apiBaseUrl;

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

export function getDownloadFilename(contentDisposition: string | null) {
  if (!contentDisposition) return undefined;

  const encodedFilename = contentDisposition.match(
    /filename\*=UTF-8''([^;]+)/i,
  )?.[1];

  if (encodedFilename) {
    try {
      return decodeURIComponent(encodedFilename.replace(/^"|"$/g, ""));
    } catch {
      return encodedFilename.replace(/^"|"$/g, "");
    }
  }

  return contentDisposition.match(/filename="?([^";]+)"?/i)?.[1];
}

export async function downloadApiFile(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
  });

  if (!response.ok) {
    let errorData: ApiErrorResponse | undefined;

    try {
      errorData = (await response.json()) as ApiErrorResponse;
    } catch {
      // The download endpoint may return a non-JSON server error.
    }

    throw new ApiError(
      errorData?.error ?? "Download failed",
      response.status,
      errorData,
    );
  }

  return {
    blob: await response.blob(),
    filename: getDownloadFilename(response.headers.get("Content-Disposition")),
  };
}
