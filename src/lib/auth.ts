/**
 * Authentication & Session Management
 * 
 * This file handles user authentication, password verification, and session management.
 * Uses bcrypt for secure password hashing and cookie-based sessions for simplicity.
 */

import { Role } from "@prisma/client";
import bcrypt from "bcryptjs"; // Password hashing library (industry standard)
import { cookies } from "next/headers"; // Next.js cookie management
import { prisma, withRetry } from "./prisma";

// Export Role enum for use in other files
export type { Role };

/**
 * Session User Interface
 * 
 * Represents the authenticated user data stored in the session.
 * Excludes sensitive information like password.
 */
export interface SessionUser {
  id: string;
  email: string;
  role: Role;
  name: string | null;
}

/**
 * User Login Function
 * 
 * Authenticates a user by verifying their email and password.
 * Returns user data (without password) if credentials are valid.
 * 
 * @param email - User's email address
 * @param password - User's plain text password
 * @returns User data if login successful, null otherwise
 */
export async function login(email: string, password: string): Promise<SessionUser | null> {
  // Look up user in database by email (with retry logic for connection resilience)
  const user = await withRetry(() => prisma.user.findUnique({ where: { email } }));
  if (!user) return null; // User doesn't exist

  // Compare provided password with hashed password in database
  // bcrypt.compare handles the hashing and comparison securely
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return null; // Password doesn't match

  // Return user data without password (security best practice)
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
}

/**
 * Get Current Session
 * 
 * Retrieves the authenticated user from the session cookie.
 * In production, you'd use Redis or a database for session storage.
 * 
 * @returns Current user session data, or null if not authenticated
 */
export async function getSession(): Promise<SessionUser | null> {
  // Get cookies from the request
  const cookieStore = await cookies();
  const sessionId = cookieStore.get("session")?.value;
  if (!sessionId) return null; // No session cookie found

  // Simplified session: we store user ID in cookie and look up user
  // In production, use proper session tokens stored in Redis/database
  try {
    // Look up user by ID stored in session cookie
    const user = await withRetry(() =>
      prisma.user.findUnique({
        where: { id: sessionId },
        select: { id: true, email: true, role: true, name: true }, // Only select needed fields
      })
    );
    return user as SessionUser | null;
  } catch {
    return null; // Database error or user not found
  }
}

/**
 * Role-Based Access Control Helper
 * 
 * Creates a function that checks if a user has one of the allowed roles.
 * Used for protecting routes and API endpoints.
 * 
 * @param allowedRoles - Array of roles that are permitted
 * @returns Function that returns true if user has required role
 * 
 * @example
 * const isAdmin = requireRole([Role.ADMIN]);
 * if (await isAdmin(user)) { ... }
 */
export function requireRole(allowedRoles: Role[]) {
  return async (user: SessionUser | null): Promise<boolean> => {
    if (!user) return false; // No user = no access
    return allowedRoles.includes(user.role); // Check if user's role is in allowed list
  };
}

