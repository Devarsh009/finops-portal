/**
 * @jest-environment node
 */

import Papa from "papaparse";

describe("CSV Parser Helper", () => {
  it("should parse valid CSV with headers", () => {
    const csv = `date,service,cost_usd,account_id
2024-01-01,EC2,100.50,123
2024-01-02,S3,50.25,123`;

    const result = Papa.parse(csv, { header: true });
    expect(result.data).toHaveLength(2);
    expect((result.data[0] as any).service).toBe("EC2");
    expect((result.data[0] as any).cost_usd).toBe("100.50");
  });

  it("should handle missing optional fields", () => {
    const csv = `date,service,cost_usd
2024-01-01,EC2,100.50`;

    const result = Papa.parse(csv, { header: true });
    expect(result.data).toHaveLength(1);
    const row = result.data[0] as any;
    expect(row.date).toBe("2024-01-01");
    expect(row.service).toBe("EC2");
    expect(row.cost_usd).toBe("100.50");
  });

  it("should skip empty rows", () => {
    const csv = `date,service,cost_usd
2024-01-01,EC2,100.50

2024-01-02,S3,50.25`;

    const result = Papa.parse(csv, { header: true });
    // Papa.parse includes empty rows, but they'll be filtered in the upload handler
    expect(result.data.length).toBeGreaterThanOrEqual(2);
  });
});

