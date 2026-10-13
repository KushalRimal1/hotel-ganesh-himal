import { NextResponse } from 'next/server';

export function proxy(request) {
  const headers = new Headers(request.headers);
  headers.set('x-hotel-pathname', request.nextUrl.pathname);
  return NextResponse.next({ request: { headers } });
}

export const config = { matcher: ['/((?!api|_next|.*\\..*).*)'] };
