import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

const DEFAULT_BACKEND_API_URL = 'http://localhost:3000/api';
const AUTH_COOKIE = 'chatbot_admin_token';
const REFRESH_COOKIE = 'chatbot_refresh_token';
const DEFAULT_ACCESS_MAX_AGE = 60 * 60 * 24 * 30;
const DEFAULT_REFRESH_MAX_AGE = 60 * 60 * 24 * 365;

function getBackendApiUrl() {
  return (process.env.BACKEND_API_URL || DEFAULT_BACKEND_API_URL).replace(/\/$/, '');
}

function ttlToSeconds(ttl?: string, fallback = DEFAULT_ACCESS_MAX_AGE) {
  const match = /^(\d+)([smhd])$/.exec(ttl || '');

  if (!match) return fallback;

  const value = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === 's' ? 1 : unit === 'm' ? 60 : unit === 'h' ? 60 * 60 : 60 * 60 * 24;
  return value * multiplier;
}

function sessionCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge,
  };
}

export async function POST(request: Request) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const backendApiUrl = getBackendApiUrl();
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const userAgent = request.headers.get('user-agent');

  console.info('[login route] request received', {
    requestId,
    origin,
    referer,
    userAgent,
    backendApiUrl,
  });

  let body: { email?: string; password?: string };

  try {
    body = await request.json();
    console.info('[login route] body parsed', {
      requestId,
      hasEmail: typeof body.email === 'string' && body.email.trim().length > 0,
      hasPassword: typeof body.password === 'string' && body.password.length > 0,
    });
  } catch (error) {
    console.warn('[login route] invalid json body', {
      requestId,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Dados de login inválidos.' }, { status: 400 });
  }

  const email = typeof body.email === 'string' ? body.email.trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!email || !password) {
    console.warn('[login route] missing credentials', {
      requestId,
      email,
      hasPassword: Boolean(password),
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: 'Informe email e senha.' }, { status: 400 });
  }

  let backendResponse: Response;

  try {
    console.info('[login route] forwarding to backend', {
      requestId,
      email,
      backendUrl: `${backendApiUrl}/auth/login`,
    });

    backendResponse = await fetch(`${backendApiUrl}/auth/login`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
  } catch (error) {
    console.error('[login route] backend fetch failed', {
      requestId,
      email,
      backendUrl: `${backendApiUrl}/auth/login`,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: 'Não foi possível conectar ao backend. Verifique se a API está rodando na porta 3000.' },
      { status: 502 }
    );
  }

  if (!backendResponse.ok) {
    let backendError = '';

    try {
      const payload = await backendResponse.clone().json() as { error?: string; message?: string };
      backendError = payload.error || payload.message || '';
    } catch {
      backendError = '';
    }

    console.warn('[login route] backend rejected login', {
      requestId,
      email,
      status: backendResponse.status,
      backendError,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json({ error: 'Usuário ou senha inválidos.' }, { status: backendResponse.status });
  }

  const payload = (await backendResponse.json()) as {
    token: string;
    refreshToken: string;
    accessTokenExpiresIn?: string;
    refreshTokenExpiresIn?: string;
    user: { email: string; role: string };
  };

  const cookieStore = await cookies();
  cookieStore.set(AUTH_COOKIE, payload.token, sessionCookieOptions(ttlToSeconds(payload.accessTokenExpiresIn)));
  cookieStore.set(REFRESH_COOKIE, payload.refreshToken, sessionCookieOptions(ttlToSeconds(payload.refreshTokenExpiresIn, DEFAULT_REFRESH_MAX_AGE)));

  console.info('[login route] login succeeded', {
    requestId,
    email: payload.user.email,
    role: payload.user.role,
    durationMs: Date.now() - startedAt,
  });

  return NextResponse.json({ success: true, user: payload.user });
}
