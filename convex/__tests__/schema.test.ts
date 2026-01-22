import { describe, it, expect } from "vitest";
import { deals, stores, priceHistory, crawlJobs, confectSchema } from "../schema";

describe("Schema Exports", () => {
  it("exports deals table definition", () => {
    expect(deals).toBeDefined();
  });

  it("exports stores table definition", () => {
    expect(stores).toBeDefined();
  });

  it("exports priceHistory table definition", () => {
    expect(priceHistory).toBeDefined();
  });

  it("exports crawlJobs table definition", () => {
    expect(crawlJobs).toBeDefined();
  });

  it("exports confectSchema with convex schema definition", () => {
    expect(confectSchema).toBeDefined();
    expect(confectSchema.convexSchemaDefinition).toBeDefined();
    expect(confectSchema.convexSchemaDefinition.tables).toBeDefined();
  });

  it("confectSchema includes all four tables", () => {
    const tables = confectSchema.convexSchemaDefinition.tables;
    expect(tables.deals).toBeDefined();
    expect(tables.stores).toBeDefined();
    expect(tables.priceHistory).toBeDefined();
    expect(tables.crawlJobs).toBeDefined();
  });
});

describe("Data Model Integration", () => {
  it("tables have expected table names", () => {
    const tables = confectSchema.convexSchemaDefinition.tables;
    expect(Object.keys(tables)).toEqual(["deals", "stores", "priceHistory", "crawlJobs"]);
  });
});
