import type { ExtractResponse } from "@mendable/firecrawl-js";
import type { DealExtraction } from "./zSchemas";

const COMPLETED = "completed" satisfies NonNullable<ExtractResponse["status"]>;
const FAILED = "failed" satisfies NonNullable<ExtractResponse["status"]>;
const CANCELLED = "cancelled" satisfies NonNullable<ExtractResponse["status"]>;
const PROCESSING = "processing" satisfies NonNullable<
  ExtractResponse["status"]
>;

export interface ExtractJob {
  jobId: string;
}

export interface ExtractJobStatusProgress {
  status: typeof PROCESSING;
  expiresAt: NonNullable<ExtractResponse["expiresAt"]>;
}

export interface ExtractJobStatusCompleted {
  status: typeof COMPLETED;
  data: Array<DealExtraction>;
  expiresAt: NonNullable<ExtractResponse["expiresAt"]>;
}

export interface ExtractJobStatusFailed {
  status: typeof FAILED;
  error: NonNullable<ExtractResponse["error"]>;
  expiresAt: NonNullable<ExtractResponse["expiresAt"]>;
}

export interface ExtractJobStatusCancelled {
  status: typeof CANCELLED;
  expiresAt: NonNullable<ExtractResponse["expiresAt"]>;
}

export type ExtractJobStatus =
  | ExtractJobStatusProgress
  | ExtractJobStatusCompleted
  | ExtractJobStatusFailed
  | ExtractJobStatusCancelled;
