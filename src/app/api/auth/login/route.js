// app/api/auth/login/route.js
import { NextResponse } from 'next/server';
import { loginUser } from '@/lib/auth';
import { createSecureSession } from '@/lib/enhancedSession';
import { validateEmail, validatePassword } from '@/lib/validation';
import { verifyCSRFToken, setCSRFToken } from '@/lib/csrf';
import { getSession } from '@/lib/session';
import { resetRateLimit } from '@/lib/rateLimit';
import { logSecurityEvent, SECURITY_EVENTS } from '@/lib/auditLog';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, twoFactorToken, csrfToken } = body;
    
    // Get IP for logging
    const headers = Object.fromEntries(request.headers);
    const ipAddress = request.ip || headers['x-forwarded-for']?.split(',')[0] || 'unknown';
    const userAgent = headers['user-agent'] || 'unknown';
    
    // CSRF Protection
    const session = await getSession();
    
    if (!csrfToken || !session.csrfToken) {
      return NextResponse.json(
        { success: false, error: 'CSRF token missing' },
        { status: 403 }
      );
    }
    
    if (!verifyCSRFToken(session.csrfToken, csrfToken)) {
      await logSecurityEvent({
        userId: null,
        eventType: SECURITY_EVENTS.CSRF_VIOLATION,
        ipAddress,
        userAgent,
        metadata: { email },
        severity: 'HIGH'
      });
      
      return NextResponse.json(
        { success: false, error: 'Invalid CSRF token' },
        { status: 403 }
      );
    }
    
    // Validation
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.error },
        { status: 400 }
      );
    }

    // Attempt login (THIS NOW HANDLES 2FA)
    const result = await loginUser(emailValidation.value, password, twoFactorToken);

    if (!result.success) {
      // Check if 2FA is required
      if (result.requires2FA) {
        return NextResponse.json(
          { 
            success: false, 
            requires2FA: true,
            error: result.error || 'Two-factor authentication required'
          },
          { status: 401 }
        );
      }

      // Regular login failure
      await logSecurityEvent({
        userId: null,
        eventType: SECURITY_EVENTS.LOGIN_FAILED,
        ipAddress,
        userAgent,
        metadata: { email: emailValidation.value, reason: result.error },
        severity: 'WARNING'
      });
      
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 401 }
      );
    }

    // Reset rate limit on successful login
    try {
      await resetRateLimit(`auth:${ipAddress}`);
    } catch (error) {
      console.error('Rate limit reset error:', error);
    }
    
    // Create secure session
    await createSecureSession(result.user, request);
    
    // Generate new CSRF token for next request
    const newSession = await getSession();
    const newCsrfToken = await setCSRFToken(newSession);

    return NextResponse.json({
      success: true,
      message: 'Login successful',
      csrfToken: newCsrfToken,
      user: {
        id: result.user.id,
        username: result.user.username,
        email: result.user.email,
        role: result.user.role 
      }
    });

  } catch (error) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get CSRF token for login form
export async function GET(request) {
  try {
    const session = await getSession();
    const csrfToken = await setCSRFToken(session);
    
    return NextResponse.json({
      success: true,
      csrfToken
    });
  } catch (error) {
    console.error('CSRF token generation error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate CSRF token' },
      { status: 500 }
    );
  }
}