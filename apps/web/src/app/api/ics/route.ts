import { NextRequest, NextResponse } from 'next/server';

const FETCH_TIMEOUT = 15_000;

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
  }

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (compatible; Todome/1.0; +https://todome.app)',
    Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.1',
  };

  const ifNoneMatch = request.headers.get('if-none-match');
  if (ifNoneMatch) headers['If-None-Match'] = ifNoneMatch;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
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
    const etag = response.headers.get('etag');

    return new NextResponse(body, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        ...(etag ? { ETag: etag } : {}),
      },
    });
  } catch (err) {
    clearTimeout(timeout);
    if (err instanceof DOMException && err.name === 'AbortError') {
      return NextResponse.json({ error: 'Timeout' }, { status: 504 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 502 },
    );
  }
}
