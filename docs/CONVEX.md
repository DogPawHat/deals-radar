Convex code lives in `convex/**`
Docs for convex can be found at `https://docs.convex.dev/llms.txt`
We are using Convex with Effect via the Confect lib, so you will need to use the effect-solutions skill to understand effect and confect
For workflows, workpools and other components that do not have direct confect equivilants, write those definitions in non-effect typescript.
After making changes to Convex code, make sure to run `npx convex dev --once` to build the Convex code.
Convex code is also type checked with `pnpm typecheck`
If you need more information on TypeScript conventions, see docs/TYPESCRIPT.md
