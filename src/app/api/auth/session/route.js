// app/api/auth/session/route.js
import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { getUserPermissions } from '@/lib/permissions';

export async function GET(request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { valid: false, reason: 'NO_SESSION' },
        { status: 401 }
      );
    }

    // Get user's permissions
    const permissions = await getUserPermissions(user.id, user.role);

    return NextResponse.json({
      valid: true,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
      },
      permissions
    });

  } catch (error) {
    console.error('Session validation error:', error);
    return NextResponse.json(
      { valid: false, reason: 'ERROR' },
      { status: 401 }
    );
  }
}
