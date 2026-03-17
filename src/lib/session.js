import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';
import { SESSION_CONFIG } from './constants';

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession(cookieStore, SESSION_CONFIG);
}

export async function createSession(userData) {
  const session = await getSession();
  session.user = {
    id: userData.id,
    username: userData.username,
    email: userData.email,
    role: userData.role,
    isActive: userData.is_active,
    createdAt: userData.created_at
  };
  session.isLoggedIn = true;
  await session.save();
  return session;
}

export async function destroySession() {
  const session = await getSession();
  session.destroy();
}

export async function getSessionUser() {
  const session = await getSession();
  if (!session.isLoggedIn || !session.user) {
    return null;
  }
  return session.user;
}