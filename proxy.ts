import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE = 'chatbot_admin_token';
const REFRESH_COOKIE = 'chatbot_refresh_token';

export function proxy(request: NextRequest) {
  const token = request.cookies.get(AUTH_COOKIE)?.value;
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;
  const hasSession = Boolean(token || refreshToken);
  const isAuthApi = request.nextUrl.pathname.startsWith('/api/auth/');
  const isLoginPage = request.nextUrl.pathname === '/login';
  const isSetupPasswordPage = request.nextUrl.pathname === '/setup-password';

  if (isAuthApi) {
    return NextResponse.next();
  }

  if (!hasSession && !isLoginPage && !isSetupPasswordPage) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (hasSession && (isLoginPage || isSetupPasswordPage)) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
