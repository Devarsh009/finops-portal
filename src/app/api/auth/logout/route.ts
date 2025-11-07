/**
 * Logout API Endpoint
 * 
 * Handles user logout by deleting the session cookie.
 * POST /api/auth/logout
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * Logout Handler
 * 
 * Removes the session cookie, effectively logging the user out.
 * 
 * Response: { message: "Logged out" }
 */
export async function POST() {
  // Get cookies from the request
  const cookieStore = await cookies();
  // Delete the session cookie
  cookieStore.delete("session");
  return NextResponse.json({ message: "Logged out" });
}

