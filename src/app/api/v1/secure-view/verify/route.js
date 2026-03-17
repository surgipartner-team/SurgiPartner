import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";

const SESSION_SECRET = process.env.SESSION_SECRET || "complex_password_at_least_32_characters_long";

export async function POST(request) {
    try {
        const { token } = await request.json();

        if (!token) {
            return NextResponse.json({ message: "Token required" }, { status: 400 });
        }

        try {
            // Verify token signature and expiry
            const decoded = jwt.verify(token, SESSION_SECRET);

            // Return the data
            return NextResponse.json({
                success: true,
                data: decoded
            });

        } catch (err) {
            // Token expired or invalid
            return NextResponse.json({
                success: false,
                message: "This link has expired or is invalid."
            }, { status: 410 }); // 410 Gone
        }

    } catch (error) {
        console.error("Verify Link Error:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}
