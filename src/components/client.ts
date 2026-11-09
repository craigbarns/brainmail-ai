export async function api<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    ...init,
    headers: {
      ...(typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('auth/') && !path.startsWith('mobile/'))
      window.location.href = '/login';
    throw new Error(data.error || 'Une erreur est survenue.');
  }
  return data;
}
export const post = (path: string, data: unknown = {}) =>
  api(path, { method: 'POST', body: JSON.stringify(data) });
export const patch = (path: string, data: unknown) =>
  api(path, { method: 'PATCH', body: JSON.stringify(data) });
export const formatDate = (date: string | null) =>
  date
    ? new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Europe/Paris',
      }).format(new Date(date.length === 10 ? date + 'T12:00:00Z' : date))
    : 'Sans date';
