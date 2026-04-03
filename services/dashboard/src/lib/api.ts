// Cliente HTTP para a API backend

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(error.error ?? `HTTP ${res.status}`);
  }

  const data = await res.json() as { data: T };
  return data.data;
}

export const api = {
  get: <T>(path: string) => apiFetch<T>(path),
  post: <T>(path: string, body: unknown) => apiFetch<T>(path, {
    method: 'POST',
    body: JSON.stringify(body),
  }),
  patch: <T>(path: string, body: unknown) => apiFetch<T>(path, {
    method: 'PATCH',
    body: JSON.stringify(body),
  }),
  delete: <T>(path: string) => apiFetch<T>(path, { method: 'DELETE' }),
};
