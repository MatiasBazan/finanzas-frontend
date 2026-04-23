export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');
  const res = await fetch(`http://localhost:3000${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 204) return null;
  if (!res.ok) throw new Error(await res.text());
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
