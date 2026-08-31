import withBundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ["@chakra-ui/react"],
  },
  // Workspace members ship TypeScript source rather than a build artifact, so
  // Next has to run them through its own compiler.
  transpilePackages: ["@kro/core", "@kro/app"],
  eslint: {
    // Lint is its own Turborepo task (`make lint` / `turbo run lint`), not a
    // build step. `next build` bundling ESLint hid a broken build behind a
    // style report: the pre-existing ESLint backlog on `main` (534 errors,
    // almost all `semi`) already fails `npm run build` there. Splitting the two
    // makes `make build` mean "does it compile and bundle" and `make lint` mean
    // "does it match the style rules" — and the backlog is cleared wholesale
    // when Biome replaces ESLint (#3), not by touching 100+ files here.
    ignoreDuringBuilds: true,
  },
  // Type errors deliberately still fail the build.
};

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
})(nextConfig);
