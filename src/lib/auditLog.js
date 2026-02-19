import { query } from './db';

export async function logSecurityEvent(eventData) {
  const {
    userId,
    eventType,
    ipAddress,
    userAgent,
    metadata,
    severity = 'INFO'
  } = eventData;
  
  try {
    await query(
      `INSERT INTO security_audit_log 
       (user_id, event_type, ip_address, user_agent, metadata, severity, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId || null,
        eventType,
        ipAddress,
        userAgent,
        JSON.stringify(metadata),
        severity
      ]
    );
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

export const SECURITY_EVENTS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGIN_LOCKED: 'LOGIN_LOCKED',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
  DEVICE_CHANGE: 'DEVICE_CHANGE',
  IP_CHANGE: 'IP_CHANGE',
  SUSPICIOUS_ACTIVITY: 'SUSPICIOUS_ACTIVITY',
  CSRF_VIOLATION: 'CSRF_VIOLATION',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  SESSION_HIJACK_ATTEMPT: 'SESSION_HIJACK_ATTEMPT'
};