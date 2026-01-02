import { Data, Schema } from "effect";

/**
 * Effect schema for extracting deal information from web pages via Firecrawl.
 * This schema represents the structure that Firecrawl should extract from deal pages.
 */
export class DealExtraction extends Schema.Class<DealExtraction>("DealExtraction")({
  title: Schema.String.annotations({
    description: "The title or name of the product/deal",
  }),
  url: Schema.String.pipe(
    Schema.pattern(/^https?:\/\/.+/),
    Schema.annotations({ description: "The full URL of the deal page" }),
  ),
  image: Schema.optionalWith(
    Schema.String.pipe(
      Schema.pattern(/^https?:\/\/.+/),
      Schema.annotations({ description: "The main product image URL" }),
    ),
    { exact: true },
  ),
  price: Schema.Number.pipe(
    Schema.nonNegative(),
    Schema.annotations({ description: "The current price of the item" }),
  ),
  currency: Schema.String.pipe(
    Schema.length(3),
    Schema.annotations({ description: "The currency code (e.g., USD, EUR)" }),
  ),
  msrp: Schema.optionalWith(
    Schema.Number.pipe(
      Schema.nonNegative(),
      Schema.annotations({
        description: "The original/MSRP price before discount",
      }),
    ),
    { exact: true },
  ),
  percentOff: Schema.optionalWith(
    Schema.Number.pipe(
      Schema.nonNegative(),
      Schema.annotations({
        description: "The percentage off the original price",
      }),
    ),
    { exact: true },
  ),
}) {}

export const DealExtractions = Schema.Array(DealExtraction);

export class AgentJob extends Data.TaggedClass("AgentJob")<{
  readonly jobId: string;
}> {}

export class AgentStateFailed extends Schema.TaggedClass<AgentStateFailed>()("AgentStateError", {
  errorMessage: Schema.String,
  expiresAt: Schema.String,
}) {}

export class AgentStatePending extends Schema.TaggedClass<AgentStatePending>()(
  "AgentStatePending",
  {
    expiresAt: Schema.String,
  },
) {}

export class AgentStateCompleted extends Schema.TaggedClass<AgentStateCompleted>()(
  "AgentStateCompleted",
  {
    data: DealExtractions,
    expiresAt: Schema.String,
  },
) {}

export const agentStateUnion = Schema.Union(
  AgentStateCompleted,
  AgentStatePending,
  AgentStateFailed,
);

export type AgentState = typeof agentStateUnion.Type;
