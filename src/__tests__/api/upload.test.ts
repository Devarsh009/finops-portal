/**
 * @jest-environment node
 */

import { POST } from "@/app/api/upload/route";

// Mock authentication - allow all requests
jest.mock("@/lib/api-auth", () => ({
  requireRoles: jest.fn().mockResolvedValue({ error: null, session: { id: "test", role: "ADMIN" } }),
}));

// Mock Prisma and withRetry
const mockCreateMany = jest.fn();
jest.mock("@/lib/prisma", () => ({
  prisma: {
    spendRecord: {
      get createMany() {
        return mockCreateMany;
      },
    },
  },
  withRetry: jest.fn((fn) => fn()),
}));

describe("POST /api/upload", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreateMany.mockResolvedValue({ count: 0 });
  });

  it("should reject request without file", async () => {
    const formData = new FormData();
    const req = new Request("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No file uploaded");
  });

  it("should handle CSV parsing and deduplication", async () => {
    const csvContent = `date,service,cost_usd,account_id,team,env
2024-01-01,EC2,100.50,123,backend,prod
2024-01-01,S3,50.25,123,backend,prod`;

    const file = new File([csvContent], "test.csv", { type: "text/csv" });
    const formData = new FormData();
    formData.append("file", file);

    mockCreateMany.mockResolvedValue({ count: 2 });

    const req = new Request("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.inserted).toBe(2);
    expect(mockCreateMany).toHaveBeenCalled();
    // Verify that validRows were passed to createMany
    expect(mockCreateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            service: "EC2",
            cost_usd: 100.5,
          }),
        ]),
        skipDuplicates: true,
      })
    );
  });

  it("should skip invalid rows", async () => {
    const csvContent = `date,service,cost_usd
2024-01-01,EC2,100.50
,InvalidService,
2024-01-02,S3,50.25`;

    const file = new File([csvContent], "test.csv", { type: "text/csv" });
    const formData = new FormData();
    formData.append("file", file);

    mockCreateMany.mockResolvedValue({ count: 2 });

    const req = new Request("http://localhost/api/upload", {
      method: "POST",
      body: formData,
    });

    const response = await POST(req);
    expect(response.status).toBe(200);
  });
});

