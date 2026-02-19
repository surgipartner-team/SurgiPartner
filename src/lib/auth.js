import { query } from "./db";
import {
  hashPassword,
  verifyPassword,
  isAccountLocked,
  calculateLockTime,
  sanitizeUserData,
} from "@/utils/security";
import { isTwoFactorEnabled, verifyTwoFactorToken } from "./twoFactor";
import { SECURITY } from "./constants";

export async function registerUser(
  username,
  email,
  mobile,  
  role,
  password
) {
  try {
    const hashedPassword = await hashPassword(password);

    const result = await query(
      `INSERT INTO users (username, email, mobile, role, password_hash) VALUES (?, ?, ?, ?, ?)`,
      [username, email, mobile, role, hashedPassword]
    );

    const [newUser] = await query(
      `SELECT id, username, email, mobile, role, created_at, is_active FROM users WHERE id = ?`,
      [result.insertId]
    );

    return { success: true, user: newUser };
  } catch (error) {
    console.error("Registration error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      if (error.message.includes("username")) {
        return { success: false, error: "Username already exists" };
      }
      if (error.message.includes("email")) {
        return { success: false, error: "Email already exists" };
      }
      if (error.message.includes("mobile")) {
        return { success: false, error: "Mobile number already exists" };
      }
    }

    return { success: false, error: "Registration failed" };
  }
}

export async function loginUser(email, password, twoFactorToken = null) {
  try {
    const [user] = await query(
      `SELECT * FROM users WHERE email = ? AND is_active = TRUE`,
      [email]
    );

    if (!user) {
      return { success: false, error: "Invalid email or password" };
    }

    if (isAccountLocked(user.locked_until)) {
      return {
        success: false,
        error: `Account is locked. Try again after ${SECURITY.LOCK_TIME_MINUTES} minutes`,
      };
    }

    const isValidPassword = await verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      const newAttempts = user.failed_login_attempts + 1;

      if (newAttempts >= SECURITY.MAX_LOGIN_ATTEMPTS) {
        const lockTime = calculateLockTime();
        await query(
          `UPDATE users SET failed_login_attempts = ?, locked_until = ? WHERE id = ?`,
          [newAttempts, lockTime, user.id]
        );
        return {
          success: false,
          error: `Account locked due to multiple failed attempts. Try again after ${SECURITY.LOCK_TIME_MINUTES} minutes`,
        };
      }

      await query(`UPDATE users SET failed_login_attempts = ? WHERE id = ?`, [
        newAttempts,
        user.id,
      ]);

      return {
        success: false,
        error: `Invalid email or password. ${
          SECURITY.MAX_LOGIN_ATTEMPTS - newAttempts
        } attempts remaining`,
      };
    }

    // Check if 2FA is enabled
    const has2FA = await isTwoFactorEnabled(user.id);

    if (has2FA) {
      if (!twoFactorToken) {
        return {
          success: false,
          requires2FA: true,
          tempUserId: user.id,
          error: "Two-factor authentication required",
        };
      }

      const is2FAValid = await verifyTwoFactorToken(user.id, twoFactorToken);

      if (!is2FAValid) {
        return {
          success: false,
          error: "Invalid two-factor authentication code",
        };
      }
    }

    await query(
      `UPDATE users SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW() WHERE id = ?`,
      [user.id]
    );

    return {
      success: true,
      user: sanitizeUserData(user),
      role: user.role,
    };
  } catch (error) {
    console.error("Login error:", error);
    return { success: false, error: "Login failed" };
  }
}

export async function getUserById(userId) {
  try {
    const [user] = await query(
      `SELECT id, username, email, mobile, role, created_at, updated_at, last_login, is_active FROM users WHERE id = ?`,
      [userId]
    );
    return user || null;
  } catch (error) {
    console.error("Get user error:", error);
    return null;
  }
}
