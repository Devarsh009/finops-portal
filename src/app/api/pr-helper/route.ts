/**
 * PR Helper API Endpoint
 * 
 * Generates a copy-ready Markdown PR note for a savings idea.
 * The PR note includes change description, savings calculations, pre-checks,
 * validation steps, and rollback plan.
 * POST /api/pr-helper
 */

import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { prisma, withRetry } from "@/lib/prisma";

/**
 * Generate PR Note Handler
 * 
 * Creates a structured Markdown PR note from a savings idea.
 * All authenticated users can generate PR notes (VIEWER, ANALYST, ADMIN).
 * 
 * Request body: { id: string } - ID of the savings idea
 * Response: { markdown: string } - Formatted Markdown PR note
 */
export async function POST(req: Request) {
  // All authenticated users can generate PR notes
  const { error: authError } = await requireAuth();
  if (authError) return authError;

  try {
    // Extract savings idea ID from request body
    const body = await req.json();
    const id = String(body?.id ?? "").trim();

    // Validate that ID is provided
    if (!id) {
      return NextResponse.json({ error: "Missing ID" }, { status: 400 });
    }

    // Log for debugging (helps track which ideas are being used)
    console.log("[PR Helper] Looking up saving idea with ID:", id);

    // Fetch savings idea from database (with retry logic for connection resilience)
    const idea = await withRetry(() =>
      prisma.savingIdea.findUnique({
        where: { id }, // Find by ID
      })
    );

    // Handle case where savings idea doesn't exist
    if (!idea) {
      console.warn(`[PR Helper] No record found for ID: ${id}`);
      return NextResponse.json({ error: "Saving idea not found" }, { status: 404 });
    }

    /**
     * Calculate Savings Math
     * 
     * Realized savings = Estimated Monthly Savings × Confidence
     * Example: $1000/month × 0.8 confidence = $800/month realized
     */
    const estMonthly = Number(idea.est_monthly_saving_usd) || 0; // Estimated monthly savings
    const confidence = Number(idea.confidence) || 0; // Confidence level (0-1)
    const realizedSaving = (estMonthly * confidence).toFixed(2); // Calculate and format to 2 decimals

    /**
     * Generate Markdown PR Note
     * 
     * Creates a structured PR note with:
     * - Change description (title and service)
     * - Savings calculation (estimated × confidence)
     * - Pre-checks checklist
     * - Validation steps
     * - Rollback plan
     * - Current status
     */
    const markdown = `
## Change
${idea.title} (${idea.service})

## Savings
Estimated Monthly: $${estMonthly} × Confidence ${confidence} = **$${realizedSaving}**

## Pre-checks
- Baseline metrics collected  
- Owner: ${idea.owner}

##  Validation
Ensure performance metrics remain within expected thresholds post-change.

##  Rollback
If regression occurs, revert configuration or deployment.

---

**Status:** ${idea.status}
`.trim();

    // Return formatted Markdown (ready to copy into PR)
    return NextResponse.json({ markdown }, { status: 200 });

  } catch (error: unknown) {
    // Handle errors gracefully (malformed JSON, database errors, etc.)
    console.error("[PR Helper] Error generating note:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Failed to generate PR note" }, { status: 500 });
  }
}
