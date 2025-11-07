/**
 * Spend Analytics API Endpoint
 * 
 * Provides spend data for the dashboard including:
 * - Daily spend trends (line chart data)
 * - Top 5 services by spend (bar chart data)
 * - Available filter options (teams, environments)
 * GET /api/spend
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma, withRetry } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/**
 * Get Spend Data Handler
 * 
 * Fetches aggregated spend data with optional filters.
 * All authenticated users can view spend data (no role restrictions).
 * 
 * Query parameters:
 * - range: Number of days (7, 30, 90) - default: 30
 * - cloud: Filter by cloud provider (aws, gcp)
 * - team: Filter by team name
 * - env: Filter by environment (prod, staging, etc.)
 * 
 * Response: { daily, topServices, availableTeams, availableEnvs }
 */
export async function GET(req: Request) {
  // All authenticated users can view spend data (VIEWER, ANALYST, ADMIN)
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    // Extract query parameters from URL
    const { searchParams } = new URL(req.url);
    const range = parseInt(searchParams.get("range") || "30"); // Default to 30 days (7, 30, 90)
    const cloud = searchParams.get("cloud") || undefined; // Optional cloud filter
    const team = searchParams.get("team") || undefined; // Optional team filter
    const env = searchParams.get("env") || undefined; // Optional environment filter

    // Calculate date range: from (today - range days) to today
    const endDate = new Date(); // Today
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - range); // Go back 'range' days

    /**
     * Build Dynamic Filter
     * 
     * Construct Prisma where clause based on query parameters.
     * Only includes filters that were provided (undefined filters are ignored).
     */
    const where: Prisma.SpendRecordWhereInput = {
      date: { gte: startDate, lte: endDate }, // Always filter by date range
    };
    if (cloud) where.cloud = cloud; // Add cloud filter if provided
    if (team) where.team = team; // Add team filter if provided
    if (env) where.env = env; // Add environment filter if provided

    /**
     * Execute Parallel Queries
     * 
     * We run 4 queries in parallel using Promise.all for better performance.
     * Each query is wrapped with withRetry for connection resilience.
     */
    const [daily, topServices, teams, envs] = await Promise.all([
      // 1️⃣ Daily spend trend: Group by date, sum costs per day (for line chart)
      withRetry(() =>
        prisma.spendRecord.groupBy({
          by: ["date"], // Group records by date
          _sum: { cost_usd: true }, // Sum all costs for each date
          where, // Apply filters (date range, cloud, team, env)
          orderBy: { date: "asc" }, // Sort chronologically
        })
      ),

      // 2️⃣ Top 5 services: Group by service, sum costs, get top 5 (for bar chart)
      withRetry(() =>
        prisma.spendRecord.groupBy({
          by: ["service"], // Group records by service name
          _sum: { cost_usd: true }, // Sum all costs for each service
          where, // Apply filters
          orderBy: { _sum: { cost_usd: "desc" } }, // Sort by total cost descending
          take: 5, // Limit to top 5 services
        })
      ),

      // 3️⃣ Get available teams: Find all unique team names in date range (for filter dropdown)
      withRetry(() =>
        prisma.spendRecord.findMany({
          where: { date: { gte: startDate, lte: endDate } }, // Only filter by date (ignore other filters)
          select: { team: true }, // Only select team field
          distinct: ["team"], // Get unique team values
        })
      ),

      // 4️⃣ Get available environments: Find all unique env values in date range (for filter dropdown)
      withRetry(() =>
        prisma.spendRecord.findMany({
          where: { date: { gte: startDate, lte: endDate } }, // Only filter by date
          select: { env: true }, // Only select env field
          distinct: ["env"], // Get unique env values
        })
      ),
    ]);

    // Return aggregated data for dashboard
    return NextResponse.json({
      daily, // Array of { date, _sum: { cost_usd } } for line chart
      topServices, // Array of { service, _sum: { cost_usd } } for bar chart
      availableTeams: teams.map((t) => t.team).filter(Boolean).sort(), // Unique team names for filter
      availableEnvs: envs.map((e) => e.env).filter(Boolean).sort(), // Unique env values for filter
    });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ error: "Failed to load dashboard data" }, { status: 500 });
  }
}
