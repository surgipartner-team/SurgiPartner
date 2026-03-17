import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { generateTwoFactorSecret } from '@/lib/twoFactor';

export async function POST(request) {
  try {
    const user = await getSessionUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { secret, qrCode } = await generateTwoFactorSecret(user.id, user.username);
    
    return NextResponse.json({
      success: true,
      secret,
      qrCode
    });
    
  } catch (error) {
    console.error('2FA enable error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to enable 2FA' },
      { status: 500 }
    );
  }
}
