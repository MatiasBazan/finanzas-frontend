export const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const AUTH_UNAUTHORIZED_EVENT = 'auth:unauthorized';

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (res.status === 401) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event(AUTH_UNAUTHORIZED_EVENT));
    }
    throw new ApiError(401, 'Sesión expirada');
  }

  if (res.status === 204) return null;

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let msg = text || res.statusText || `Error ${res.status}`;
    try {
      const parsed = JSON.parse(text);
      msg = parsed.message ?? parsed.error ?? msg;
      if (Array.isArray(msg)) msg = msg.join(', ');
    } catch {
      /* keep msg */
    }
    throw new ApiError(res.status, msg);
  }

  return res.json();
}

export const api = {
  get: (url: string) => apiFetch(url),
  post: (url: string, body: unknown) =>
    apiFetch(url, { method: 'POST', body: JSON.stringify(body) }),
  patch: (url: string, body: unknown) =>
    apiFetch(url, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (url: string) => apiFetch(url, { method: 'DELETE' }),
};
