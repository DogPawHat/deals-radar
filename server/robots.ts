import { Effect, Schema, Context, Layer } from "effect";

type FetchLike = (input: URL | RequestInfo, init?: RequestInit) => Promise<Response>;

export class RobotsParseError extends Schema.TaggedError<RobotsParseError>()("RobotsParseError", {
  message: Schema.String,
  error: Schema.Defect,
}) {}

export class RobotsFetchError extends Schema.TaggedError<RobotsFetchError>()("RobotsFetchError", {
  message: Schema.String,
  url: Schema.String,
  error: Schema.Defect,
}) {}

export interface RobotsRule {
  allow: string;
  disallow: string;
}

export interface ParsedRobotsTxt {
  rules: RobotsRule[];
  isBlocked: (path: string) => boolean;
}

const parseDirectives = (lines: string[]): { allows: string[]; disallows: string[] } => {
  const allows: string[] = [];
  const disallows: string[] = [];

  for (const line of lines) {
    const commentIndex = line.indexOf("#");
    const withoutComment = commentIndex >= 0 ? line.slice(0, commentIndex) : line;
    const trimmed = withoutComment.trim();
    const lower = trimmed.toLowerCase();

    if (lower.startsWith("allow:")) {
      const value = trimmed.substring(6).trim();
      if (value) {
        allows.push(value);
      }
    } else if (lower.startsWith("disallow:")) {
      const value = trimmed.substring(9).trim();
      if (value) {
        disallows.push(value);
      }
    }
  }

  return { allows, disallows };
};

const pathMatchesRule = (path: string, pattern: string): boolean => {
  if (!pattern || pattern === "/") {
    return true;
  }

  if (pattern.endsWith("*")) {
    const prefix = pattern.slice(0, -1);
    return path.startsWith(prefix);
  }

  if (pattern.endsWith("$")) {
    const prefix = pattern.slice(0, -1);
    return path === prefix;
  }

  return path.startsWith(pattern);
};

export const parseRobotsTxt = (content: string): Effect.Effect<ParsedRobotsTxt, RobotsParseError> =>
  Effect.try({
    try: () => {
      const lines = content.split("\n").filter((line) => !line.startsWith("#"));
      const { allows, disallows } = parseDirectives(lines);

      const rules: RobotsRule[] = [
        ...allows.map((allow) => ({ allow, disallow: "" })),
        ...disallows.map((disallow) => ({ allow: "", disallow })),
      ];

      const isBlocked = (path: string): boolean => {
        for (const disallow of disallows) {
          if (pathMatchesRule(path, disallow)) {
            const matchingAllow = allows.find(
              (allow) => pathMatchesRule(path, allow) && allow.length > disallow.length,
            );
            if (!matchingAllow) {
              return true;
            }
          }
        }
        return false;
      };

      return { rules, isBlocked };
    },
    catch: (error) =>
      RobotsParseError.make({
        message: "Failed to parse robots.txt",
        error,
      }),
  });

export const fetchRobotsTxt = (
  baseUrl: string,
  fetchImpl: FetchLike = globalThis.fetch,
): Effect.Effect<{ content: string; url: string }, RobotsFetchError> =>
  Effect.tryPromise({
    try: async () => {
      let robotsUrl: URL;

      try {
        robotsUrl = new URL("/robots.txt", baseUrl);
      } catch {
        const normalizedUrl = baseUrl.startsWith("http") ? baseUrl : `https://${baseUrl}`;
        robotsUrl = new URL("/robots.txt", normalizedUrl);
      }

      const response = await fetchImpl(robotsUrl.toString());

      if (!response.ok && response.status !== 404) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = response.status === 404 ? "" : await response.text();

      return { content, url: robotsUrl.toString() };
    },
    catch: (error) =>
      RobotsFetchError.make({
        message: "Failed to fetch robots.txt",
        url: baseUrl,
        error,
      }),
  });

export const fetchAndParseRobotsTxt = (
  baseUrl: string,
  fetchImpl: FetchLike = globalThis.fetch,
): Effect.Effect<
  { rules: RobotsRule[]; isBlocked: (path: string) => boolean },
  RobotsParseError | RobotsFetchError
> =>
  Effect.gen(function* () {
    const { content } = yield* fetchRobotsTxt(baseUrl, fetchImpl);

    if (!content) {
      return {
        rules: [],
        isBlocked: () => false,
      };
    }

    const parsed = yield* parseRobotsTxt(content);
    return parsed;
  });

export class RobotsService extends Context.Tag("deals-radar/convex/RobotsService")<
  RobotsService,
  {
    readonly fetchAndParse: (
      baseUrl: string,
    ) => Effect.Effect<
      { rules: RobotsRule[]; isBlocked: (path: string) => boolean },
      RobotsParseError | RobotsFetchError
    >;
  }
>() {
  static readonly layer = Layer.succeed(RobotsService, {
    fetchAndParse: fetchAndParseRobotsTxt,
  });
}
