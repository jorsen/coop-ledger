import { SessionOptions } from 'iron-session';

export interface SessionData {
  isLoggedIn: boolean;
  userId?: number;
  username?: string;
  // Set when the logged-in account is a super admin. adminUserId/adminUsername
  // stay fixed to the admin's own account even while userId/username are
  // temporarily swapped to "view as" another account's data.
  isAdmin?: boolean;
  adminUserId?: number;
  adminUsername?: string;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'fallback_secret_change_this_in_production!!',
  cookieName: 'coop-ledger-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  },
};
