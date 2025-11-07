/**
 * Login API Endpoint
 * 
 * Handles user authentication by verifying email/password and creating a session.
 * POST /api/auth/login
 */

import { NextResponse } from "next/server";
import { login } from "@/lib/auth";
import { cookies } from "next/headers";

/**
 * Login Handler
 * 
 * Authenticates a user and creates a session cookie.
 * 
 * Request body: { email: string, password: string }
 * Response: { user: { email, role, name } } on success
 */
export async function POST(req: Request) {
  try {
    // Extract email and password from request body
    const { email, password } = await req.json();

    // Validate that both fields are provided
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }

    // Verify credentials against database
    const user = await login(email, password);

    // If login fails (wrong email or password), return 401 Unauthorized
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Create session cookie with user ID
    // In production, use secure session tokens (JWT) stored in Redis/database
    const cookieStore = await cookies();
    cookieStore.set("session", user.id, {
      httpOnly: true, // Prevents JavaScript access (XSS protection)
      secure: process.env.NODE_ENV === "production", // HTTPS only in production
      sameSite: "lax", // CSRF protection
      maxAge: 60 * 60 * 24 * 7, // Session expires in 7 days
    });

    // Return user data (without sensitive info like password)
    return NextResponse.json({ user: { email: user.email, role: user.role, name: user.name } });
  } catch (error: unknown) {
    console.error("Login error:", error);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

