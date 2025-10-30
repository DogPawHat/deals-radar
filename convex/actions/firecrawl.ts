"use node";

import Firecrawl from "@mendable/firecrawl-js";
import { v } from "convex/values";

import { env } from "../../src/env/convex";
import { internalAction } from "../_generated/server";
import { z, toJSONSchema } from "zod/v4";

const dealExtractionSchema = z
  .object({
    title: z.string().describe("The title or name of the product"),
    url: z.url().describe("The full URL of the product page"),
    price: z.number().describe("The current price of the item"),
    currency: z
      .string()
      .length(3)
      .describe("The currency code (e.g., USD, EUR)"),
    msrp: z
      .number()
      .optional()
      .describe("The original/MSRP price before discount"),
    percentOff: z
      .number()
      .optional()
      .describe("The percentage off the original price"),
  })
  .array();

const schemaObject = toJSONSchema(dealExtractionSchema);

function createClient() {
  const apiKey = env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not configured for this deployment.");
  }
  return new Firecrawl({ apiKey });
}

export const startExtract = internalAction({
  args: {
    urls: v.array(v.string()),
    showSources: v.optional(v.boolean()),
  },
  handler: async (_ctx, args) => {
    const firecrawlClient = createClient();

    const response = await firecrawlClient.startExtract({
      urls: args.urls,
      schema: schemaObject,
      showSources: args.showSources ?? true,
    });

    if (!response?.id) {
      throw new Error(
        `Firecrawl extract did not return a job id. Response: ${JSON.stringify(response)}`,
      );
    }

    return {
      jobId: response.id,
    };
  },
});

export const getExtractStatus = internalAction({
  args: { jobId: v.string() },
  handler: async (_ctx, { jobId }) => {
    const firecrawlClient = createClient();

    const extraction = await firecrawlClient.getExtractStatus(jobId);

    switch (extraction.status) {
      case "completed":
        return {
          status: "completed" as const,
          data: dealExtractionSchema.parse(extraction.data),
          expiresAt: extraction.expiresAt!,
        };
      case "failed":
        return {
          status: "failed" as const,
          error: extraction.error!,
          expiresAt: extraction.expiresAt!,
        };
      case "cancelled":
        return {
          status: "canceled" as const,
          expiresAt: extraction.expiresAt!,
        };
      case "processing":
        return {
          status: "processing" as const,
          expiresAt: extraction.expiresAt!,
        };
    }

    throw new Error(`Firecrawl extract status not found for job id: ${jobId}`);
  },
});
