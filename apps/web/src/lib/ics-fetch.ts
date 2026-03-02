export type IcsFetchResult = {
  body: string;
  etag: string | null;
} | null; // null = 304 Not Modified

const FETCH_TIMEOUT = 15_000; // 15s – matches server proxy

/** Normalize webcal:// (common in Outlook) to https:// */
function normalizeIcsUrl(url: string): string {
  return url.replace(/^webcal:\/\//i, 'https://');
}

/** Detect Tauri desktop via __TAURI_INTERNALS__ (used by cors-fetch plugin). */
function isTauriEnv(): boolean {
  return (
    typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
  );
}

export async function fetchIcs(
  url: string,
  etag: string | null,
): Promise<IcsFetchResult> {
  const normalizedUrl = normalizeIcsUrl(url);

  if (isTauriEnv()) {
    return fetchIcsTauri(normalizedUrl, etag);
  }

  return fetchIcsProxy(normalizedUrl, etag);
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
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (compatible; Todome/1.0; +https://todome.app)',
    Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.1',
    'Accept-Language': 'ja,en;q=0.9',
  };
  if (etag) headers['If-None-Match'] = etag;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (response.status === 304) return null;
    if (!response.ok) {
      throw new Error(
        `カレンダーサーバーがエラーを返しました (HTTP ${response.status})`,
      );
    }

    const body = await response.text();
    return { body, etag: response.headers.get('etag') };
  } catch (err) {
    clearTimeout(timeout);

    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('カレンダーの取得がタイムアウトしました');
    }
    if (
      err instanceof Error &&
      err.message.startsWith('カレンダー')
    ) {
      throw err;
    }

    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(`カレンダーの取得に失敗しました: ${detail}`);
  }
}
