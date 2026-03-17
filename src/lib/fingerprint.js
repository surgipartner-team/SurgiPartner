import crypto from 'crypto';

export function generateFingerprint(headers, ip) {
  const components = [
    headers['user-agent'] || '',
    headers['accept-language'] || '',
    headers['accept-encoding'] || '',
    ip || ''
  ];
  
  return crypto
    .createHash('sha256')
    .update(components.join('|'))
    .digest('hex'); 
}

export async function verifyDeviceFingerprint(session, request) {
  const currentFingerprint = generateFingerprint(
    request.headers,
    request.ip || request.headers['x-forwarded-for']?.split(',')[0]
  );
  
  if (!session.deviceFingerprint) {
    session.deviceFingerprint = currentFingerprint;
    await session.save();
    return { valid: true, isNewDevice: true };
  }
  
  const isValid = session.deviceFingerprint === currentFingerprint;
  
  return { 
    valid: isValid, 
    isNewDevice: false,
    fingerprint: currentFingerprint 
  };
}