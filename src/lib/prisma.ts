/**
 * Database Connection Manager
 * 
 * This file manages our PostgreSQL database connection using Prisma ORM.
 * It implements a singleton pattern to ensure only one database connection
 * exists throughout the application lifecycle, preventing connection pool exhaustion.
 */

import { PrismaClient } from "@prisma/client";

// Type-safe global storage for Prisma client (prevents multiple instances in Next.js dev mode)
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/**
 * Prisma Client Singleton
 * 
 * Creates a single database connection instance that's reused across the app.
 * In Next.js development, modules are reloaded on every change, so we store
 * the client in global scope to prevent creating new connections.
 */
export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Log database errors and warnings in development for debugging
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
    datasources: {
      db: {
        url: process.env.DATABASE_URL, // Connection string from environment variables
      },
    },
  });

// Store Prisma Client in global scope during development to prevent connection leaks
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

/**
 * Connection Health Monitoring
 * 
 * Tracks database connection status and verifies connectivity before queries.
 * This prevents errors when the database is temporarily unavailable.
 */

// Track connection state to avoid redundant health checks
let isConnected = false;
let connectionCheckPromise: Promise<boolean> | null = null;

/**
 * Health Check Function
 * 
 * Performs a simple SQL query to verify the database is reachable.
 * Uses a promise cache to prevent multiple simultaneous health checks.
 */
async function checkConnection(): Promise<boolean> {
  // If a health check is already in progress, wait for it instead of starting a new one
  if (connectionCheckPromise) {
    return connectionCheckPromise;
  }

  // Execute health check and cache the promise
  connectionCheckPromise = (async () => {
    try {
      // Simple query to test connectivity (SELECT 1 is the fastest possible query)
      await prisma.$queryRaw`SELECT 1`;
      isConnected = true;
      return true;
    } catch (error) {
      isConnected = false;
      console.warn("Database connection check failed, will reconnect on next query");
      return false;
    } finally {
      // Clear the promise cache so future checks can run
      connectionCheckPromise = null;
    }
  })();

  return connectionCheckPromise;
}

/**
 * Connection Assurance
 * 
 * Ensures the database connection is active before executing queries.
 * This is called before every database operation to prevent connection errors.
 */
async function ensureConnection(): Promise<void> {
  if (!isConnected) {
    await checkConnection();
  }
}

/**
 * Retry Wrapper with Exponential Backoff
 * 
 * Wraps database operations with automatic retry logic for connection errors.
 * Uses exponential backoff (500ms, 1000ms, 2000ms) to avoid overwhelming the database.
 * 
 * @param operation - The database operation to execute
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @param initialDelay - Initial delay in milliseconds before first retry (default: 500ms)
 * @returns The result of the database operation
 * 
 * @example
 * const users = await withRetry(() => prisma.user.findMany());
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  initialDelay = 500
): Promise<T> {
  let lastError: unknown;
  
  // Attempt the operation up to maxRetries times
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Verify connection is active before attempting the operation
      await ensureConnection();
      
      // Execute the database operation
      return await operation();
    } catch (error: unknown) {
      lastError = error;
      
      // Extract error information for analysis
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorString = String(error);
      
      // Detect connection-related errors (network issues, database unavailable, etc.)
      const isConnectionError =
        errorMessage.includes("connection") ||
        errorMessage.includes("ECONNREFUSED") ||
        errorMessage.includes("10054") ||
        errorMessage.includes("forcibly closed") ||
        errorMessage.includes("Closed") ||
        errorString.includes("P1001") || // Prisma connection error code
        errorString.includes("P1017"); // Prisma connection closed error code
      
      // Only retry on connection errors, not on data validation errors
      if (isConnectionError) {
        // Mark connection as down so we'll check it again next time
        isConnected = false;
        
        // If we haven't exhausted retries, attempt reconnection
        if (attempt < maxRetries) {
          // Exponential backoff: delay doubles with each attempt (500ms → 1000ms → 2000ms)
          const delay = initialDelay * Math.pow(2, attempt - 1);
          console.warn(
            `Database connection error (attempt ${attempt}/${maxRetries}). Retrying in ${delay}ms...`
          );
          
          // Attempt to reconnect: disconnect cleanly, wait, then reconnect
          try {
            await prisma.$disconnect();
            await new Promise((resolve) => setTimeout(resolve, delay));
            await prisma.$connect();
            isConnected = true;
          } catch (reconnectError) {
            console.warn("Reconnection attempt failed, will retry query");
          }
          
          // Continue to next retry attempt
          continue;
        }
      }
      
      // For non-connection errors or after max retries, throw immediately
      throw error;
    }
  }
  
  // If all retries failed, throw the last error
  throw lastError;
}

/**
 * Graceful Shutdown Handlers
 * 
 * Ensures database connections are properly closed when the application shuts down.
 * This prevents connection leaks and ensures clean termination.
 */
if (typeof process !== "undefined") {
  /**
   * Cleanup Function
   * 
   * Disconnects from the database and resets connection state.
   * Called automatically when the process is about to exit.
   */
  const gracefulShutdown = async () => {
    try {
      await prisma.$disconnect(); // Close all database connections
      isConnected = false;
    } catch (error) {
      console.error("Error during Prisma disconnect:", error);
    }
  };

  // Register shutdown handlers for different termination signals
  process.on("beforeExit", gracefulShutdown); // Normal termination
  process.on("SIGINT", async () => { // Ctrl+C
    await gracefulShutdown();
    process.exit(0);
  });
  process.on("SIGTERM", async () => { // Termination signal from process manager
    await gracefulShutdown();
    process.exit(0);
  });
}
