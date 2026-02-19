// app/api/auth/register/route.js
import { NextResponse } from "next/server";
import { registerUser } from "@/lib/auth";
import { createSession } from "@/lib/session";
import {
  validateEmail,
  validateUsername,
  validatePassword,
  validateMobile,
} from "@/lib/validation";

export async function POST(request) {
  try {
    const body = await request.json();
    const { username, email, mobile, role, password, confirmPassword } = body;

    const usernameValidation = validateUsername(username);
    if (!usernameValidation.valid) {
      return NextResponse.json(
        { success: false, error: usernameValidation.error },
        { status: 400 }
      );
    }

    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return NextResponse.json(
        { success: false, error: emailValidation.error },
        { status: 400 }
      );
    }

    const mobileValidation = validateMobile(mobile);
    if (!mobileValidation.valid) {
      return NextResponse.json(
        { success: false, error: mobileValidation.error },
        { status: 400 }
      );
    }

    if (!role || !role.trim()) {
      return NextResponse.json(
        { success: false, error: "Role selection is required" },
        { status: 400 }
      );
    }

    const validRoles = ["admin", "coordinator", "doctor", "patient"];
    if (!validRoles.includes(role.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "Invalid role selected" },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.error },
        { status: 400 }
      );
    }

    if (password !== confirmPassword) {
      return NextResponse.json(
        { success: false, error: "Passwords do not match" },
        { status: 400 }
      );
    }

    const result = await registerUser(
      usernameValidation.value,
      emailValidation.value,
      mobileValidation.value,
      role.toLowerCase(),
      password
    );

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    // AUTO-LOGIN: Create session immediately after registration
    await createSession(result.user);

    return NextResponse.json(
      {
        success: true,
        message: "Registration successful",
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          mobile: result.user.mobile,
          role: result.user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration API error", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
