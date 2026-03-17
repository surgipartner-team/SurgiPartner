import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request) {
  try {
    const { email } = await request.json();

    // Validate email
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Check if user exists
    const users = await query(
      "SELECT id, username, email FROM users WHERE email = ?",
      [email]
    );

    // Always return success to prevent email enumeration
    // But only send email if user exists
    if (users.length > 0) {
      const user = users[0];

      // Generate reset token (valid for 1 hour)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenHash = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');
      
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      // Store reset token in database
      await query(
        `UPDATE users 
         SET reset_token = ?, 
             reset_token_expires = ? 
         WHERE id = ?`,
        [resetTokenHash, expiresAt, user.id]
      );

      // Send reset email
      const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
      
      await sendPasswordResetEmail({
        to: user.email,
        username: user.username,
        resetUrl,
      });
    }

    // Always return success message (security best practice)
    return NextResponse.json(
      { 
        message: "If an account exists with this email, you will receive password reset instructions shortly." 
      },
      { status: 200 }
    );

  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { 
        error: "Failed to process request",
        message: error.message 
      },
      { status: 500 }
    );
  }
}