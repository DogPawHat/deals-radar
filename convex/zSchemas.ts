import { z, toJSONSchema } from "zod/v4";

/**
 * Zod schema for extracting deal information from web pages via Firecrawl.
 * This schema represents the structure that Firecrawl should extract from deal pages.
 */
export const dealExtractionSchema = z.object({
  title: z.string().describe("The title or name of the product/deal"),
  url: z.url().describe("The full URL of the deal page"),
  image: z.url().optional().describe("The main product image URL"),
  price: z.number().nonnegative().describe("The current price of the item"),
  currency: z.string().length(3).describe("The currency code (e.g., USD, EUR)"),
  msrp: z
    .number()
    .nonnegative()
    .optional()
    .describe("The original/MSRP price before discount"),
  percentOff: z
    .number()
    .nonnegative()
    .optional()
    .describe("The percentage off the original price"),
});
export type DealExtraction = z.infer<typeof dealExtractionSchema>;

export const dealsArrayExtractionSchema = z.array(
  dealExtractionSchema,
) satisfies z.ZodType<Array<DealExtraction>>;

/**
 * Convert the Zod schema to JSON Schema format for Firecrawl SDK
 * Firecrawl expects a JSON Schema object that describes the structure to extract
 */
export function getDealExtractionJSONSchema() {
  return toJSONSchema(dealExtractionSchema);
}

/**
 * Convert the Zod schema for an array of deals to JSON Schema format
 */
export function getDealsArrayJSONSchema() {
  return toJSONSchema(dealsArrayExtractionSchema);
}
