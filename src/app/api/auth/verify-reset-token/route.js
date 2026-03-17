import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import crypto from "crypto";

export async function POST(request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: "Reset token is required" },
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
      `SELECT id, email, reset_token_expires 
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

    return NextResponse.json(
      { message: "Token is valid" },
      { status: 200 }
    );

  } catch (error) {
    console.error("Verify reset token error:", error);
    return NextResponse.json(
      { 
        error: "Failed to verify token",
        message: error.message 
      },
      { status: 500 }
    );
  }
}