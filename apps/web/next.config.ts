import withBundleAnalyzer from '@next/bundle-analyzer'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    optimizePackageImports: ['@chakra-ui/react'],
  },
  // Workspace members ship TypeScript source rather than a build artifact, so
  // Next has to run them through its own compiler.
  transpilePackages: ['@kro/core', '@kro/app'],
  eslint: {
    // There is no ESLint in this repo any more — Biome is the linter and it
    // runs as its own verb (`make lint`). This flag stops `next build` from
    // looking for an ESLint install that will never be there, and keeps the
    // split intact: `make build` answers "does it compile and bundle",
    // `make lint` answers "does it match the rules".
    ignoreDuringBuilds: true,
  },
  // Type errors deliberately still fail the build.
}

export default withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
})(nextConfig)
