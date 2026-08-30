import { NextResponse } from 'next/server';
const backend = () => (process.env.BACKEND_API_URL || 'http://localhost:3000/api').replace(/\/$/, '');
export async function POST(request: Request) {
  try {
    const response = await fetch(`${backend()}/auth/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(await request.json()) });
    return NextResponse.json(await response.json(), { status: response.status });
  } catch { return NextResponse.json({ error: 'Não foi possível solicitar a recuperação.' }, { status: 503 }); }
}
