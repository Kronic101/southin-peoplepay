import { env } from '../config/env';
import { getSession } from '../storage/session';

function buildUrl(path: string) {
  const cleanBase = env.apiBaseUrl.replace(/\/$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${cleanBase}${cleanPath}`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const session = await getSession();
  const url = buildUrl(path);

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}),
        ...(options.headers || {}),
      },
    });
  } catch (err: any) {
    throw new Error(
      `Failed to reach API at ${url}. Check that the API is running, CORS is enabled, and the phone can reach the PC IP address.`,
    );
  }

  let body: any = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(
      body?.message ||
        body?.error ||
        `Request failed with status ${response.status} at ${url}`,
    );
  }

  return body as T;
}

export function apiGet<T>(path: string) {
  return apiRequest<T>(path);
}

export function apiPost<T>(path: string, payload: any) {
  return apiRequest<T>(path, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function apiPatch<T>(path: string, payload: any) {
  return apiRequest<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}