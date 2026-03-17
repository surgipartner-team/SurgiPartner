import { getSession } from "./session";
import { generateFingerprint } from "./fingerprint";
import { logSecurityEvent, SECURITY_EVENTS } from "./auditLog";

export async function createSecureSession(userData, request) {
  const session = await getSession();
  const headers = Object.fromEntries(request.headers);
  const ipAddress =
    request.ip || headers["x-forwarded-for"]?.split(",")[0] || "unknown";

  const fingerprint = generateFingerprint(headers, ipAddress);

  session.user = {
    id: userData.id,
    username: userData.username,
    email: userData.email,
    role: userData.role || userData.role,
    isActive: userData.is_active,
    createdAt: userData.created_at,
  };
  session.isLoggedIn = true;
  session.deviceFingerprint = fingerprint;
  session.ipAddress = ipAddress;
  session.createdAt = Date.now();
  session.lastActivity = Date.now();

  await session.save();

  await logSecurityEvent({
    userId: userData.id,
    eventType: SECURITY_EVENTS.LOGIN_SUCCESS,
    ipAddress,
    userAgent: headers["user-agent"] || "unknown",
    metadata: { fingerprint },
    severity: "INFO",
  });

  return session;
}

export async function validateSession(request) {
  const session = await getSession();

  if (!session.isLoggedIn || !session.user) {
    return { valid: false, reason: "NO_SESSION" };
  }

  const now = Date.now();
  const inactiveTime = now - (session.lastActivity || now);
  const MAX_INACTIVE = 24 * 60 * 60 * 1000; // 24 hours

  if (inactiveTime > MAX_INACTIVE) {
    await session.destroy();
    return { valid: false, reason: "TIMEOUT" };
  }

  const headers = Object.fromEntries(request.headers);
  const currentIP =
    request.ip || headers["x-forwarded-for"]?.split(",")[0] || "unknown";

  const currentFingerprint = generateFingerprint(headers, currentIP);

  if (session.deviceFingerprint !== currentFingerprint) {
    await logSecurityEvent({
      userId: session.user.id,
      eventType: SECURITY_EVENTS.SESSION_HIJACK_ATTEMPT,
      ipAddress: currentIP,
      userAgent: headers["user-agent"] || "unknown",
      metadata: {
        expectedFingerprint: session.deviceFingerprint,
        actualFingerprint: currentFingerprint,
      },
      severity: "CRITICAL",
    });

    await session.destroy();
    return { valid: false, reason: "DEVICE_MISMATCH" };
  }

  if (session.ipAddress && session.ipAddress !== currentIP) {
    await logSecurityEvent({
      userId: session.user.id,
      eventType: SECURITY_EVENTS.IP_CHANGE,
      ipAddress: currentIP,
      userAgent: headers["user-agent"] || "unknown",
      metadata: {
        oldIP: session.ipAddress,
        newIP: currentIP,
      },
      severity: "WARNING",
    });

    session.ipAddress = currentIP;
    session.requiresReauth = true;
  }

  session.lastActivity = now;
  await session.save();

  return {
    valid: true,
    session,
    requiresReauth: session.requiresReauth || false,
  };
}
