import { NextResponse } from 'next/server';
const backend = () => (process.env.BACKEND_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
export async function POST(request: Request) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for');
    const clientIp = request.headers.get('x-real-ip') || forwardedFor?.split(',').at(-1)?.trim();
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (clientIp) headers['X-Forwarded-For'] = clientIp;

    const response = await fetch(`${backend()}/auth/register`, { method: 'POST', headers, body: JSON.stringify(await request.json()) });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch { return NextResponse.json({ error: 'Não foi possível criar a conta.' }, { status: 503 }); }
}
