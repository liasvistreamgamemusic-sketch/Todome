export type IcsFetchResult = {
  body: string;
  etag: string | null;
} | null; // null = 304 Not Modified

export async function fetchIcs(
  url: string,
  etag: string | null,
): Promise<IcsFetchResult> {
  const isTauri =
    typeof window !== 'undefined' && '__TAURI__' in window;

  if (isTauri) {
    return fetchIcsTauri(url, etag);
  }

  return fetchIcsProxy(url, etag);
}

async function fetchIcsProxy(
  url: string,
  etag: string | null,
): Promise<IcsFetchResult> {
  const proxyUrl = `/api/ics?url=${encodeURIComponent(url)}`;
  const headers: Record<string, string> = {};
  if (etag) headers['If-None-Match'] = etag;

  const response = await fetch(proxyUrl, { headers });

  if (response.status === 304) return null;

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      (data as Record<string, string>).error ?? `HTTP ${response.status}`,
    );
  }

  const body = await response.text();
  return { body, etag: response.headers.get('etag') };
}

async function fetchIcsTauri(
  url: string,
  etag: string | null,
): Promise<IcsFetchResult> {
  // Tauri desktop has no CORS restrictions, so use native fetch directly
  const headers: Record<string, string> = {
    'User-Agent': 'Todome/1.0 (Calendar Subscription)',
    Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.1',
  };
  if (etag) headers['If-None-Match'] = etag;

  const response = await fetch(url, { headers });
  if (response.status === 304) return null;
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const body = await response.text();
  return { body, etag: response.headers.get('etag') };
}
