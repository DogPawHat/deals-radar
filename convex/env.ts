import { Config } from "effect";

export const convexEnv = {
  clerkSecretKey: Config.redacted("CLERK_SECRET_KEY"),
  clerkJwtIssuerDomain: Config.string("CLERK_JWT_ISSUER_DOMAIN"),
  firecrawlApiKey: Config.redacted("FIRECRAWL_API_KEY"),
  convexUrl: Config.string("VITE_CONVEX_URL"),
};
