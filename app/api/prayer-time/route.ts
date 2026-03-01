import { NextRequest, NextResponse } from 'next/server';

const ISLAMIC_API_BASE_URL = 'https://islamicapi.com/api/v1/prayer-time';

export async function GET(request: NextRequest) {
  const apiKey = process.env.ISLAMIC_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        code: 500,
        status: 'error',
        message: 'Server configuration error: ISLAMIC_API_KEY is missing',
      },
      { status: 500 }
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const lat = searchParams.get('lat');
  const lon = searchParams.get('lon');
  const method = searchParams.get('method') ?? '20';
  const school = searchParams.get('school') ?? '1';

  if (!lat || !lon) {
    return NextResponse.json(
      {
        code: 400,
        status: 'error',
        message: 'lat and lon query parameters are required',
      },
      { status: 400 }
    );
  }

  const upstreamParams = new URLSearchParams({
    lat,
    lon,
    method,
    school,
    api_key: apiKey,
  });

  try {
    const upstreamResponse = await fetch(`${ISLAMIC_API_BASE_URL}?${upstreamParams.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const payload = await upstreamResponse.json();

    return NextResponse.json(payload, {
      status: upstreamResponse.status,
    });
  } catch {
    return NextResponse.json(
      {
        code: 502,
        status: 'error',
        message: 'Failed to contact islamicapi.com',
      },
      { status: 502 }
    );
  }
}
