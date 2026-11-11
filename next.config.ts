import type { NextConfig } from "next";

/**
 * Local/dev builds run the normal Next.js server.
 * `GITHUB_PAGES=true` produces a fully static export served from
 * https://vijayapardhu.github.io/DayChallenge/ so the project-page subpath
 * needs to be baked in as the basePath.
 */
const isPages = process.env.GITHUB_PAGES === "true";
const repoName = "DayChallenge";

const nextConfig: NextConfig = {
  // Cache Components / partial prefetching need the Next server runtime.
  cacheComponents: !isPages,
  partialPrefetching: !isPages,
  output: isPages ? "export" : undefined,
  basePath: isPages ? `/${repoName}` : undefined,
  trailingSlash: true,
  images: { unoptimized: true },
  turbopack: {
    // Silence the "ignored package-lock.json" warning when the project lives
    // inside a directory that also has its own lockfile.
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;