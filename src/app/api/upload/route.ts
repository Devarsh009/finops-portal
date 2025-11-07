/**
 * CSV Upload API Endpoint
 * 
 * Handles billing CSV file uploads from AWS or GCP.
 * Validates, deduplicates, and stores spend records in the database.
 * POST /api/upload
 */

import { NextResponse } from "next/server";
import Papa from "papaparse"; // CSV parsing library
import { Role } from "@prisma/client";
import { requireRoles } from "@/lib/api-auth";
import { prisma, withRetry } from "@/lib/prisma";

/**
 * Upload Handler
 * 
 * Processes CSV file uploads with the following steps:
 * 1. Authenticate user (only ADMIN/ANALYST can upload)
 * 2. Parse CSV file
 * 3. Auto-detect cloud provider (AWS/GCP) from filename
 * 4. Validate and normalize data
 * 5. Deduplicate rows
 * 6. Bulk insert into database
 * 
 * Request: FormData with "file" field containing CSV
 * Response: { message, inserted, skipped }
 */
export const POST = async (req: Request) => {
  // Role-Based Access Control: Only ADMIN and ANALYST can upload files
  const { error: authError } = await requireRoles([Role.ADMIN, Role.ANALYST]);
  if (authError) return authError;

  try {
    // Extract file from multipart form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    // Validate that a file was provided
    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Read file contents and parse CSV
    const text = await file.text();
    const parsed = Papa.parse(text, { header: true }); // Parse with first row as headers
    const rows = parsed.data as Array<Record<string, string>>;

    // Validate file is not empty
    if (!rows.length) {
      return NextResponse.json({ error: "Empty CSV file" }, { status: 400 });
    }

    // Auto-detect cloud provider from filename (AWS or GCP)
    const fileName = file.name.toLowerCase();
    let cloud: "aws" | "gcp" = "aws"; // Default to AWS

    if (fileName.includes("gcp")) cloud = "gcp";
    else if (fileName.includes("aws")) cloud = "aws";

    /**
     * Data Validation & Deduplication
     * 
     * We process each row to:
     * - Map different column names to our standard format (AWS vs GCP have different headers)
     * - Validate required fields (date, service, cost_usd)
     * - Create a unique deduplication key
     * - Skip invalid or duplicate rows
     */
    const seen = new Set<string>(); // Track seen rows to prevent duplicates
    const validRows: Array<{
      date: Date;
      cloud: "aws" | "gcp";
      account_or_project: string;
      service: string;
      team: string;
      env: string;
      cost_usd: number;
      dedupe_key: string;
    }> = [];

    for (const row of rows) {
      // Normalize field names: AWS and GCP use different column names, so we map them
      const date = row.date || row.usage_start_time || row.usage_date;
      const account_or_project =
        row.account_id || row.project_id || row.billing_account_id;
      const service =
        row.service || row.service_description || row.sku_description;
      const team = row.team || row.owner || row.department;
      const env = row.env || row.environment || row.stage;
      const cost_usd = row.cost_usd || row.cost || row.cost_amount;

      // Skip rows missing required fields (date, service, cost_usd)
      if (!date || !service || !cost_usd) continue;

      // Create unique deduplication key from all fields
      // This prevents the same row from being inserted twice
      const key = `${date}_${cloud}_${account_or_project}_${service}_${team}_${env}_${cost_usd}`;
      if (seen.has(key)) continue; // Skip duplicate
      seen.add(key);

      // Add validated row to our collection
      validRows.push({
        date: new Date(date), // Convert string to Date object
        cloud,
        account_or_project: account_or_project || "unknown", // Default if missing
        service,
        team: team || "unassigned", // Default if missing
        env: env || "prod", // Default to production
        cost_usd: parseFloat(cost_usd), // Convert string to number
        dedupe_key: key, // Store dedupe key for database uniqueness constraint
      });
    }

    // Ensure we have at least one valid row after processing
    if (!validRows.length) {
      return NextResponse.json(
        { error: "No valid rows found after parsing" },
        { status: 400 }
      );
    }

    // Bulk insert all valid rows into database
    // skipDuplicates: true ensures database-level deduplication (uses dedupe_key unique constraint)
    // withRetry: Wraps operation with automatic retry on connection errors
    const result = await withRetry(() =>
      prisma.spendRecord.createMany({
        data: validRows,
        skipDuplicates: true, // Ignore rows that already exist (database-level dedupe)
      })
    );

    // Return success response with statistics
    return NextResponse.json({
      message: `Uploaded successfully (${cloud.toUpperCase()} detected)`,
      inserted: result.count, // Number of rows actually inserted
      skipped: rows.length - result.count, // Rows skipped (duplicates or invalid)
    });
  } catch (error: unknown) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
};
