import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { verifyTwoFactorToken, enableTwoFactor } from '@/lib/twoFactor';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/auditLog';

export async function POST(request) {
  try {
    const user = await getSessionUser();
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const { token } = await request.json();
    
    const isValid = await verifyTwoFactorToken(user.id, token);
    
    if (!isValid) {
      await logSecurityEvent({
        userId: user.id,
        eventType: SECURITY_EVENTS.LOGIN_FAILED,
        ipAddress: request.ip,
        userAgent: request.headers.get('user-agent'),
        metadata: { reason: '2FA verification failed' },
        severity: 'WARNING'
      });
      
      return NextResponse.json(
        { success: false, error: 'Invalid verification code' },
        { status: 400 }
      );
    }
    
    // Enable 2FA after successful verification
    await enableTwoFactor(user.id);
    
    await logSecurityEvent({
      userId: user.id,
      eventType: 'TWO_FACTOR_ENABLED',
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
      metadata: {},
      severity: 'INFO'
    });
    
    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully'
    });
    
  } catch (error) {
    console.error('2FA verify error:', error);
    return NextResponse.json(
      { success: false, error: 'Verification failed' },
      { status: 500 }
    );
  }
}