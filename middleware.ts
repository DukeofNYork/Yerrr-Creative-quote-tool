import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE, verifySession } from '@/lib/auth';

export const config = {
  matcher: ['/admin/:path*', '/api/config', '/api/leads', '/api/admin/:path*'],
};

const PUBLIC_ADMIN_PATHS = new Set<string>([
  '/admin/login',
  '/admin/signup',
  '/api/admin/login',
  '/api/admin/signup',
  '/api/admin/logout',
]);

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const method = req.method;

  if (PUBLIC_ADMIN_PATHS.has(pathname)) return NextResponse.next();

  const needsAuth =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/api/admin/') ||
    (pathname === '/api/config' && method !== 'GET') ||
    (pathname === '/api/leads' && method === 'GET');

  if (!needsAuth) return NextResponse.next();

  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (session) return NextResponse.next();

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = '/admin/login';
  url.search = '';
  return NextResponse.redirect(url);
}
