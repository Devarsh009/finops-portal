/**
 * API Authentication Middleware
 * 
 * Provides reusable authentication and authorization functions for API routes.
 * These functions check if a user is authenticated and has the required permissions.
 */

import { NextResponse } from "next/server";
import { getSession, requireRole, Role } from "./auth";

/**
 * Require Authentication
 * 
 * Middleware function that ensures a user is logged in.
 * Returns an error response if the user is not authenticated.
 * 
 * @returns Object with error response (if not authenticated) or session data
 * 
 * @example
 * const { error, session } = await requireAuth();
 * if (error) return error; // User not logged in
 */
export async function requireAuth() {
  // Get current user session from cookie
  const session = await getSession();
  if (!session) {
    // Return 401 Unauthorized if no session found
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }), session: null };
  }
  // User is authenticated, return session data
  return { error: null, session };
}

/**
 * Require Specific Roles
 * 
 * Middleware function that ensures a user is authenticated AND has one of the allowed roles.
 * Used to protect routes that only certain roles can access (e.g., only ADMIN can delete).
 * 
 * @param allowedRoles - Array of roles that are permitted to access this endpoint
 * @returns Object with error response (if not authorized) or session data
 * 
 * @example
 * const { error, session } = await requireRoles([Role.ADMIN, Role.ANALYST]);
 * if (error) return error; // User doesn't have required role
 */
export async function requireRoles(allowedRoles: Role[]) {
  // First check if user is authenticated at all
  const { error, session } = await requireAuth();
  if (error) return { error, session: null }; // Not authenticated

  // Check if authenticated user has one of the required roles
  const hasRole = await requireRole(allowedRoles)(session);
  if (!hasRole) {
    // User is authenticated but doesn't have the right role (403 Forbidden)
    return {
      error: NextResponse.json({ error: "Forbidden: Insufficient permissions" }, { status: 403 }),
      session: null,
    };
  }

  // User is authenticated and has required role
  return { error: null, session };
}

