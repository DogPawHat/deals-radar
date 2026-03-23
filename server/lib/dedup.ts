import { Effect, Schema } from "effect";

// ============================================================================
// Configuration
// ============================================================================

/** Tracking parameters to drop during URL normalization */
export const DROP_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "mc_eid",
  "mc_cid",
  "ref",
  "referrer",
  "aff",
  "aff_id",
  "affiliate",
  "utm_id",
  "utm_reader",
  "utm_viz_id",
  "utm_pubreferrer",
  "oly_enc_id",
  "oly_anon_id",
  "ascsrc",
  "cmp",
  "_branch_match_id",
  "_branch_referrer",
  "igshid",
  "mkt_tok",
  "spm",
]);

// ============================================================================
// Error Types
// ============================================================================

export class CreateHashError extends Schema.TaggedError<CreateHashError>()("CreateHashError", {
  message: Schema.String,
  error: Schema.Defect,
}) {}

export class NormalizeUrlError extends Schema.TaggedError<NormalizeUrlError>()(
  "NormalizeUrlError",
  {
    message: Schema.String,
    error: Schema.Defect,
  },
) {}

// ============================================================================
// Pure Functions
// ============================================================================

/** Normalize title by trimming, lowercasing, and collapsing whitespace */
export const normalizeTitle = (title: string): string =>
  title.trim().toLowerCase().replace(/\s+/g, " ");

// ============================================================================
// Effect Functions
// ============================================================================

/** SHA-256 hash using Web Crypto API */
export const createHash = (input: string): Effect.Effect<string, CreateHashError> =>
  Effect.tryPromise({
    try: async () => {
      const data = new TextEncoder().encode(input);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    },
    catch: (error) =>
      CreateHashError.make({
        message: "Hashing failed",
        error,
      }),
  });

/** Normalize URL by lowercasing host, removing tracking params, sorting params, etc. */
export const normalizeUrl = (raw: string): Effect.Effect<string, NormalizeUrlError> =>
  Effect.try({
    try: () => {
      const u = new URL(raw);

      // Normalize host
      u.hostname = u.hostname.toLowerCase();

      // Remove default ports
      if (
        (u.protocol === "http:" && u.port === "80") ||
        (u.protocol === "https:" && u.port === "443")
      ) {
        u.port = "";
      }

      // Drop fragment
      u.hash = "";

      // Filter and sort query parameters
      const kept = new URLSearchParams();
      for (const [k, v] of u.searchParams.entries()) {
        if (!DROP_PARAMS.has(k)) {
          kept.append(k, v);
        }
      }

      const keptSorted = new URLSearchParams(
        [...kept.entries()].sort((a, b) => a[0].localeCompare(b[0])),
      );

      u.search = keptSorted.toString() ? `?${keptSorted.toString()}` : "";

      // Normalize trailing slash (except root)
      if (u.pathname.endsWith("/") && u.pathname !== "/") {
        u.pathname = u.pathname.replace(/\/+$/, "");
      }

      return u.toString();
    },
    catch: (error) =>
      NormalizeUrlError.make({
        message: "URL normalization failed",
        error,
      }),
  });

/** Build deduplication key from URL and title */
export const buildDedupKey = (url: string, title: string) =>
  Effect.gen(function* () {
    const canonicalUrl = yield* normalizeUrl(url);
    const normalizedTitle = normalizeTitle(title);
    const keyInput = `${canonicalUrl}|${normalizedTitle}`;
    const dedupKey = yield* createHash(keyInput);
    return { canonicalUrl, dedupKey };
  });
