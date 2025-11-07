/**
 * @jest-environment node
 */

import { GET, POST, PUT, DELETE } from "@/app/api/savings/route";

// Mock authentication - allow all requests
jest.mock("@/lib/api-auth", () => ({
  requireAuth: jest.fn().mockResolvedValue({ error: null, session: { id: "test", role: "ADMIN" } }),
  requireRoles: jest.fn().mockResolvedValue({ error: null, session: { id: "test", role: "ADMIN" } }),
}));

// Mock Prisma and withRetry
const mockFindMany = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDelete = jest.fn();

jest.mock("@/lib/prisma", () => ({
  prisma: {
    savingIdea: {
      get findMany() {
        return mockFindMany;
      },
      get create() {
        return mockCreate;
      },
      get update() {
        return mockUpdate;
      },
      get delete() {
        return mockDelete;
      },
    },
  },
  withRetry: jest.fn((fn) => fn()),
}));

describe("Savings API", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /api/savings", () => {
    it("should return all savings ideas", async () => {
      const mockIdeas = [
        {
          id: "1",
          title: "Test Idea",
          service: "EC2",
          est_monthly_saving_usd: 100,
          confidence: 0.8,
          owner: "John",
          status: "PROPOSED",
        },
      ];

      mockFindMany.mockResolvedValue(mockIdeas);

      const req = new Request("http://localhost/api/savings");
      const response = await GET(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual(mockIdeas);
    });

    it("should filter by status", async () => {
      mockFindMany.mockResolvedValue([]);

      const req = new Request("http://localhost/api/savings?status=APPROVED");
      await GET(req);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: "APPROVED" },
        })
      );
    });
  });

  describe("POST /api/savings", () => {
    it("should create a new savings idea", async () => {
      const newIdea = {
        title: "New Idea",
        service: "S3",
        est_monthly_saving_usd: 200,
        confidence: 0.9,
        owner: "Jane",
        status: "PROPOSED",
      };

      mockCreate.mockResolvedValue({ id: "2", ...newIdea });

      const req = new Request("http://localhost/api/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newIdea),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.title).toBe(newIdea.title);
    });

    it("should reject missing required fields", async () => {
      const req = new Request("http://localhost/api/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Incomplete" }),
      });

      const response = await POST(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing required fields");
    });
  });

  describe("PUT /api/savings", () => {
    it("should update an existing savings idea", async () => {
      const update = {
        id: "1",
        title: "Updated Idea",
        status: "APPROVED",
      };

      mockUpdate.mockResolvedValue({ id: "1", ...update });

      const req = new Request("http://localhost/api/savings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });

      const response = await PUT(req);
      expect(response.status).toBe(200);
    });
  });

  describe("DELETE /api/savings", () => {
    it("should delete a savings idea", async () => {
      mockDelete.mockResolvedValue({});

      const req = new Request("http://localhost/api/savings?id=1", {
        method: "DELETE",
      });

      const response = await DELETE(req);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe("Deleted successfully");
    });

    it("should reject request without id", async () => {
      const req = new Request("http://localhost/api/savings", {
        method: "DELETE",
      });

      const response = await DELETE(req);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe("Missing ID");
    });
  });
});

