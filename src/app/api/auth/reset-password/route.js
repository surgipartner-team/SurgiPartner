import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { SECURITY, VALIDATION } from "@/lib/constants";

export async function POST(request) {
  try {
    const { token, password } = await request.json();

    // Validate input
    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < VALIDATION.PASSWORD.MIN_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${VALIDATION.PASSWORD.MIN_LENGTH} characters long` },
        { status: 400 }
      );
    }

    if (!VALIDATION.PASSWORD.PATTERN.test(password)) {
      return NextResponse.json(
        { error: "Password must contain uppercase, lowercase, number, and special character" },
        { status: 400 }
      );
    }

    // Hash the token to compare with database
    const resetTokenHash = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid reset token
    const users = await query(
      `SELECT id, email 
       FROM users 
       WHERE reset_token = ? 
       AND reset_token_expires > NOW()`,
      [resetTokenHash]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    const user = users[0];

    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, SECURITY.BCRYPT_ROUNDS);

    // Update password and clear reset token
    await query(
      `UPDATE users 
       SET password_hash = ?, 
           reset_token = NULL, 
           reset_token_expires = NULL,
           updated_at = NOW()
       WHERE id = ?`,
      [hashedPassword, user.id]
    );

    return NextResponse.json(
      { message: "Password reset successful" },
      { status: 200 }
    );

  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { 
        error: "Failed to reset password",
        message: error.message 
      },
      { status: 500 }
    );
  }
}