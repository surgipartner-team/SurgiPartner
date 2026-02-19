import crypto from 'crypto';

export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

export async function setCSRFToken(session) {
  const token = generateCSRFToken();
  session.csrfToken = token;
  await session.save();
  return token;
}

export function verifyCSRFToken(sessionToken, requestToken) {
  if (!sessionToken || !requestToken) {
    return false;
  }
  return crypto.timingSafeEqual(
    Buffer.from(sessionToken),
    Buffer.from(requestToken)
  );
}