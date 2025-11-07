/**
 * Current User API Endpoint
 * 
 * Returns the currently authenticated user's information.
 * GET /api/auth/me
 */

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * Get Current User Handler
 * 
 * Retrieves the authenticated user's data from the session.
 * Used by the frontend to check if user is logged in and get their role.
 * 
 * Response: { user: { email, role, name } } if authenticated
 * Response: { error: "Not authenticated" } if not logged in
 */
export async function GET() {
  // Get current user session from cookie
  const session = await getSession();
  
  // If no session exists, user is not authenticated
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Return user data (excluding sensitive information)
  return NextResponse.json({
    user: {
      email: session.email,
      role: session.role,
      name: session.name,
    },
  });
}

