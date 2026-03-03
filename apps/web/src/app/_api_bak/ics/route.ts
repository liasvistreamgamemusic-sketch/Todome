import { NextRequest, NextResponse } from 'next/server';

const MAX_ICS_SIZE = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT = 15_000; // 15 seconds

/** Normalize webcal:// to https:// (common in Apple/Outlook subscription URLs). */
function normalizeUrl(raw: string): string {
  return raw.replace(/^webcal:\/\//i, 'https://');
}

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  const url = normalizeUrl(rawUrl);

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    return NextResponse.json({ error: 'Only HTTP(S) URLs allowed' }, { status: 400 });
  }

  const ifNoneMatch = request.headers.get('if-none-match');
  const headers: HeadersInit = {
    'User-Agent': 'Mozilla/5.0 (compatible; Todome/1.0; +https://todome.app)',
    Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.1',
    'Accept-Language': 'ja,en;q=0.9',
  };
  if (ifNoneMatch) {
    headers['If-None-Match'] = ifNoneMatch;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      redirect: 'follow',
    });

    clearTimeout(timeout);

    if (response.status === 304) {
      return new NextResponse(null, { status: 304 });
    }

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream returned ${response.status}` },
        { status: 502 },
      );
    }

    const body = await response.text();

    if (body.length > MAX_ICS_SIZE) {
      return NextResponse.json(
        { error: 'ICS file too large (max 5MB)' },
        { status: 413 },
      );
    }

    const responseHeaders: Record<string, string> = {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'private, max-age=300',
    };

    const etag = response.headers.get('etag');
    if (etag) {
      responseHeaders['ETag'] = etag;
    }

    return new NextResponse(body, { status: 200, headers: responseHeaders });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Fetch failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
