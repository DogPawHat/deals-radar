# Environment Variables

This document describes all environment variables required for the project.

## Local Development

Create a `.env.local` file in the project root with the following variables:

```env
# Convex
VITE_CONVEX_URL=

# Clerk (Authentication)
VITE_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_JWT_ISSUER_DOMAIN=

# Firecrawl (Web Scraping)
FIRECRAWL_API_KEY=
```

## Convex Dashboard

Set these in your Convex project settings:

| Variable                  | Description                                |
| ------------------------- | ------------------------------------------ |
| `CLERK_JWT_ISSUER_DOMAIN` | Clerk JWT Issuer Domain (Frontend API URL) |
| `CLERK_SECRET_KEY`        | Clerk Secret Key                           |
| `FIRECRAWL_API_KEY`       | Firecrawl API Key                          |

## Netlify Deploy Variables

Set these in Netlify dashboard under Site settings > Environment variables:

| Variable                     | Value                      |
| ---------------------------- | -------------------------- |
| `VITE_CONVEX_URL`            | Your Convex deployment URL |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk Publishable Key      |
| `CLERK_SECRET_KEY`           | Clerk Secret Key           |
| `CLERK_JWT_ISSUER_DOMAIN`    | Clerk JWT Issuer Domain    |
| `FIRECRAWL_API_KEY`          | Firecrawl API Key          |

## Client-Side (Vite)

Variables prefixed with `VITE_` are exposed to the client:

- `VITE_CONVEX_URL` - Convex URL for client-side queries
- `VITE_CLERK_PUBLISHABLE_KEY` - Clerk publishable key for authentication

## Server-Side (Convex)

These are only available in Convex functions:

- `CLERK_SECRET_KEY` - Clerk secret for server-side auth
- `CLERK_JWT_ISSUER_DOMAIN` - Clerk JWT issuer for Convex auth config
- `FIRECRAWL_API_KEY` - Firecrawl API key for crawling
