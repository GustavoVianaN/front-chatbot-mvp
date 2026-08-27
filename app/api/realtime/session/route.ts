import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const DEFAULT_BACKEND_API_URL = 'http://localhost:3000/api';
const AUTH_COOKIE = 'chatbot_admin_token';

function getBackendApiUrl() {
  if (!process.env.BACKEND_API_URL && process.env.NODE_ENV === 'production') {
    throw new Error('BACKEND_API_URL is required');
  }

  return (process.env.BACKEND_API_URL || DEFAULT_BACKEND_API_URL).replace(/\/$/, '');
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE)?.value;

  if (!token) {
    return NextResponse.json({ error: 'Sessão expirada.' }, { status: 401 });
  }

  let body: { sdp?: string };

  try {
    body = await request.json() as { sdp?: string };
  } catch {
    return NextResponse.json({ error: 'Oferta WebRTC inválida.' }, { status: 400 });
  }

  try {
    const response = await fetch(`${getBackendApiUrl()}/dashboard/company-intake/realtime-call`, {
      method: 'POST',
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sdp: body.sdp }),
    });
    const payload = await response.json() as { sdp?: string; error?: string; message?: string };

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Não foi possível iniciar a conversa por voz agora. Tente novamente em instantes.' },
        { status: response.status },
      );
    }

    return NextResponse.json({ sdp: payload.sdp });
  } catch {
    return NextResponse.json({ error: 'Não foi possível conectar ao serviço de voz.' }, { status: 502 });
  }
}
