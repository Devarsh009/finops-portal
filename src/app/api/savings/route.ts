/**
 * Savings Pipeline API Endpoint
 * 
 * Handles CRUD operations for savings ideas (Proposed → Approved → Realized).
 * GET: All authenticated users can view
 * POST/PUT/DELETE: Only ADMIN and ANALYST can modify
 * 
 * Routes:
 * - GET /api/savings?status=PROPOSED - List all savings ideas (optional status filter)
 * - POST /api/savings - Create new savings idea
 * - PUT /api/savings - Update existing savings idea
 * - DELETE /api/savings?id=<id> - Delete savings idea
 */

import { NextResponse } from "next/server";
import { Prisma, Role, SavingStatus } from "@prisma/client";
import { requireAuth, requireRoles } from "@/lib/api-auth";
import { prisma, withRetry } from "@/lib/prisma";

/**
 * Get All Savings Ideas
 * 
 * Retrieves all savings ideas, optionally filtered by status.
 * All authenticated users can view (VIEWER, ANALYST, ADMIN).
 * 
 * Query parameters:
 * - status: Optional filter by status (PROPOSED, APPROVED, REALIZED)
 * 
 * Response: Array of savings ideas
 */
export async function GET(req: Request) {
  // All authenticated users can view savings ideas
  const { error: authError } = await requireAuth();
  if (authError) return authError;
  
  // Extract status filter from query parameters
  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status");

  try {
    /**
     * Build Filter Clause
     * 
     * If status parameter is provided and valid, filter by status.
     * Otherwise, return all savings ideas.
     */
    const whereClause: Prisma.SavingIdeaWhereInput =
      statusParam && Object.values(SavingStatus).includes(statusParam as SavingStatus)
        ? { status: statusParam as SavingStatus } // Filter by status if valid
        : {}; // No filter, return all

    // Fetch savings ideas from database (with retry logic)
    const ideas = await withRetry(() =>
      prisma.savingIdea.findMany({
        where: whereClause, // Apply status filter if provided
        orderBy: { createdAt: "desc" }, // Most recent first
      })
    );

    return NextResponse.json(ideas, { status: 200 });
  } catch (error) {
    console.error("GET /savings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch savings" },
      { status: 500 }
    );
  }
}

/**
 * Create New Savings Idea
 * 
 * Creates a new savings idea in the database.
 * Only ADMIN and ANALYST can create (VIEWER cannot).
 * 
 * Request body: { title, service, est_monthly_saving_usd, confidence, owner, status?, notes? }
 * Response: Created savings idea
 */
export async function POST(req: Request) {
  // Role-Based Access Control: Only ADMIN and ANALYST can create savings ideas
  const { error: authError } = await requireRoles([Role.ADMIN, Role.ANALYST]);
  if (authError) return authError;

  try {
    // Extract data from request body
    const data = await req.json();
    const {
      title,
      service,
      est_monthly_saving_usd,
      confidence,
      owner,
      status,
      notes,
    } = data;

    // Validate required fields
    if (!title || !service || !owner) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Create new savings idea in database
    const newIdea = await withRetry(() =>
      prisma.savingIdea.create({
        data: {
          title,
          service,
          est_monthly_saving_usd: parseFloat(est_monthly_saving_usd), // Convert string to number
          confidence: parseFloat(confidence), // Convert string to number (0-1 range)
          owner,
          status: status || "PROPOSED", // Default to PROPOSED if not provided
          notes, // Optional field
        },
      })
    );

    return NextResponse.json(newIdea, { status: 201 });
  } catch (error) {
    console.error("POST /savings error:", error);
    return NextResponse.json(
      { error: "Failed to create saving idea" },
      { status: 500 }
    );
  }
}

/**
 * Update Existing Savings Idea
 * 
 * Updates an existing savings idea in the database.
 * Only ADMIN and ANALYST can update (VIEWER cannot).
 * 
 * Request body: { id, ...updates } (any fields to update)
 * Response: Updated savings idea
 */
export async function PUT(req: Request) {
  // Role-Based Access Control: Only ADMIN and ANALYST can update savings ideas
  const { error: authError } = await requireRoles([Role.ADMIN, Role.ANALYST]);
  if (authError) return authError;

  try {
    // Extract data from request body
    const data = await req.json();
    const { id, ...updates } = data; // Separate ID from update fields

    // Validate that ID is provided
    if (!id)
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    // Update savings idea in database
    const updatedIdea = await withRetry(() =>
      prisma.savingIdea.update({
        where: { id: String(id) }, // Find by ID
        data: updates, // Update with provided fields
      })
    );

    return NextResponse.json(updatedIdea, { status: 200 });
  } catch (error) {
    console.error("PUT /savings error:", error);
    return NextResponse.json(
      { error: "Failed to update saving idea" },
      { status: 500 }
    );
  }
}

/**
 * Delete Savings Idea
 * 
 * Deletes a savings idea from the database.
 * Only ADMIN and ANALYST can delete (VIEWER cannot).
 * 
 * Query parameters:
 * - id: ID of the savings idea to delete
 * 
 * Response: { message: "Deleted successfully" }
 */
export async function DELETE(req: Request) {
  // Role-Based Access Control: Only ADMIN and ANALYST can delete savings ideas
  const { error: authError } = await requireRoles([Role.ADMIN, Role.ANALYST]);
  if (authError) return authError;

  try {
    // Extract ID from query parameters
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    // Validate that ID is provided
    if (!id)
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    // Delete savings idea from database
    await withRetry(() =>
      prisma.savingIdea.delete({
        where: { id: String(id) }, // Find by ID and delete
      })
    );

    return NextResponse.json({ message: "Deleted successfully" }, { status: 200 });
  } catch (error) {
    console.error("DELETE /savings error:", error);
    return NextResponse.json(
      { error: "Failed to delete saving idea" },
      { status: 500 }
    );
  }
}
