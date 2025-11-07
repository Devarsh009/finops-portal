/**
 * @jest-environment node
 */

import { POST } from "@/app/api/pr-helper/route";

// Mock authentication - allow all requests
jest.mock("@/lib/api-auth", () => ({
  requireAuth: jest.fn().mockResolvedValue({ error: null, session: { id: "test", role: "ADMIN" } }),
}));

// Mock Prisma and withRetry
const mockFindUnique = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    savingIdea: {
      get findUnique() {
        return mockFindUnique;
      },
    },
  },
  withRetry: jest.fn((fn) => fn()),
}));

describe("POST /api/pr-helper", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should generate PR markdown for valid idea", async () => {
    const mockIdea = {
      id: "1",
      title: "Optimize EC2 instances",
      service: "EC2",
      est_monthly_saving_usd: 500,
      confidence: 0.8,
      owner: "John Doe",
      status: "APPROVED",
    };

    mockFindUnique.mockResolvedValue(mockIdea);

    const req = new Request("http://localhost/api/pr-helper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "1" }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.markdown).toContain("Optimize EC2 instances");
    expect(data.markdown).toContain("EC2");
    expect(data.markdown).toContain("$500");
    expect(data.markdown).toContain("John Doe");
  });

  it("should return 404 for non-existent idea", async () => {
    mockFindUnique.mockResolvedValue(null);

    const req = new Request("http://localhost/api/pr-helper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "999" }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Saving idea not found");
  });

  it("should reject request without id", async () => {
    const req = new Request("http://localhost/api/pr-helper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Missing ID");
  });

  it("should calculate savings correctly", async () => {
    const mockIdea = {
      id: "1",
      title: "Test",
      service: "S3",
      est_monthly_saving_usd: 1000,
      confidence: 0.75,
      owner: "Jane",
      status: "PROPOSED",
    };

    mockFindUnique.mockResolvedValue(mockIdea);

    const req = new Request("http://localhost/api/pr-helper", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "1" }),
    });

    const response = await POST(req);
    const data = await response.json();

    expect(data.markdown).toContain("$750.00"); // 1000 * 0.75
  });
});

