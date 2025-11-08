"use node";

import type {
  ExtractJob,
  ExtractJobStatus,
  ExtractJobStatusCancelled,
  ExtractJobStatusCompleted,
  ExtractJobStatusFailed,
  ExtractJobStatusProgress,
} from "./types";

import Firecrawl from "@mendable/firecrawl-js";
import { v } from "convex/values";

import { env } from "../src/env/convex";
import { internalAction } from "./_generated/server";

import {
  dealsArrayExtractionSchema,
  getDealsArrayJSONSchema,
} from "./zSchemas";

const extractDealsPrompt = `
  You are a helpful assistant that extracts deals from a web store.
  You will be given a web store and you will need to extract the deals from the store.
  Return the deals in an array of objects as per the schema you were given.
`;

function createClient() {
  const apiKey = env.FIRECRAWL_API_KEY;
  if (!apiKey) {
    throw new Error("FIRECRAWL_API_KEY is not configured for this deployment.");
  }
  return new Firecrawl({ apiKey });
}

export class JobInProgressError extends Error {
  _tag: "JobInProgressError";
  constructor(message: string) {
    super(message);
    this.name = "JobInProgressError";
    this._tag = "JobInProgressError";
  }
}

export class JobFailedError extends Error {
  _tag: "JobFailedError";
  constructor(message: string) {
    super(message);
    this.name = "JobFailedError";
    this._tag = "JobFailedError";
  }
}

async function getExtractStatus(jobId: string) {
  const firecrawlClient = createClient();

  try {
    const extraction = await firecrawlClient.getExtractStatus(jobId);
    switch (extraction.status) {
      case "completed":
        return {
          status: "completed" as const,
          data: dealsArrayExtractionSchema.parse(extraction.data),
          expiresAt: extraction.expiresAt!,
        } satisfies ExtractJobStatusCompleted;
      case "failed":
        return {
          status: "failed" as const,
          error: extraction.error!,
          expiresAt: extraction.expiresAt!,
        } satisfies ExtractJobStatusFailed;
      case "cancelled":
        return {
          status: "cancelled" as const,
          expiresAt: extraction.expiresAt!,
        } satisfies ExtractJobStatusCancelled;
      case "processing":
        return {
          status: "processing" as const,
          expiresAt: extraction.expiresAt!,
        } satisfies ExtractJobStatusProgress;
    }
    throw new Error(`status not found`);
  } catch (error) {
    console.error(error);
    throw new Error(`Failed to get extract status for job id: ${jobId}`);
  }
}

export const startExtract = internalAction({
  args: {
    urls: v.array(v.string()),
    showSources: v.optional(v.boolean()),
  },
  handler: async (_ctx, args): Promise<ExtractJob> => {
    const firecrawlClient = createClient();

    const response = await firecrawlClient.startExtract({
      urls: args.urls,
      prompt: extractDealsPrompt,
      schema: getDealsArrayJSONSchema(),
      showSources: args.showSources ?? true,
    });

    if (!response?.id) {
      throw new Error(
        `Firecrawl extract did not return a job id. Response: ${JSON.stringify(response)}`,
      );
    }

    return {
      jobId: response.id,
    } satisfies ExtractJob;
  },
});

export const getExtractData = internalAction({
  args: { jobId: v.string() },
  handler: async (_ctx, { jobId }): Promise<ExtractJobStatus> => {
    const result = await getExtractStatus(jobId);

    return result;
  },
});
