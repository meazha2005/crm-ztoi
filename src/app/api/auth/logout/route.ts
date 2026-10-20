import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_NAME, getSessionUser, recordAuditLog } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (user) {
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
      const userAgent = req.headers.get('user-agent') || 'Browser';
      await recordAuditLog('logout', 'ztoi_mgmnt_system_users', user.id, null, null, user.id, ip, userAgent);
    }
  } catch (err) {
    // Ignore errors on logout
  }

  const response = NextResponse.redirect(new URL('/login', req.url), 303);
  response.cookies.delete(COOKIE_NAME);
  return response;
}
