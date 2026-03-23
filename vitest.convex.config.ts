import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "edge-runtime",
    server: { deps: { inline: ["convex-test"] } },
    include: ["tests/**/*.test.ts"],
    exclude: [
      "tests/convex/deals.test.ts",
      "tests/convex/stores.test.ts",
      "tests/convex/crawlJobs.test.ts",
      "tests/convex/crawls.test.ts",
      "tests/convex/publicDeals.test.ts",
      "tests/convex/dealsWrite.test.ts",
    ],
  },
});
