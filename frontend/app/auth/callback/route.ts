import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/home';

  if (code) {
    // Redirect to a client-side page that will exchange the code using the
    // browser Supabase client (which persists the session in localStorage).
    const params = new URLSearchParams({ code, next });
    return NextResponse.redirect(new URL(`/auth/confirm?${params}`, requestUrl.origin));
  }

  return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin));
}
