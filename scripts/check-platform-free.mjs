#!/usr/bin/env node
/**
 * Workspace-boundary check for `packages/core`.
 *
 * `packages/core` is the platform-free domain tier: it must compile and run
 * anywhere a JS engine runs, with no React, no Next.js, no DOM and no Node
 * built-ins. This is enforced twice over:
 *
 *   1. structurally — `packages/core/tsconfig.json` sets `lib: ["ES2022"]` and
 *      `types: []`, so `document`, `window` and `process` have no typings at
 *      all and `pnpm -r exec tsc --noEmit` rejects them; and
 *   2. by name — this script, wired as `@kro/core`'s `lint` task, so a banned
 *      import fails `make lint` with a readable message rather than a type error.
 *
 * Run: `node scripts/check-platform-free.mjs` (cwd may be anywhere).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const coreSrc = join(repoRoot, 'packages', 'core', 'src')
const corePackageJson = join(repoRoot, 'packages', 'core', 'package.json')

/** Module specifiers `packages/core` may never import (exact name or subpath). */
const BANNED_MODULES = [
  'react',
  'react-dom',
  'next',
  'next-auth',
  'next-themes',
  '@chakra-ui/react',
  '@emotion/react',
  'react-icons',
  'node:fs',
  'node:path',
  'fs',
  'path',
]

/** Globals that only exist on a platform, not in the ECMAScript language. */
const BANNED_GLOBALS = [
  'window',
  'document',
  'navigator',
  'localStorage',
  'sessionStorage',
  'process',
]

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]/g
const BARE_IMPORT_RE = /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g
const REQUIRE_RE = /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g

function collectFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      out.push(...collectFiles(full))
    } else if (/\.(ts|tsx|js|mjs|cjs)$/.test(full)) {
      out.push(full)
    }
  }
  return out
}

function isBanned(specifier) {
  return BANNED_MODULES.some(
    (banned) => specifier === banned || specifier.startsWith(`${banned}/`),
  )
}

/** Strips line and block comments so commented-out code is not flagged. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const violations = []

for (const file of collectFiles(coreSrc)) {
  const where = relative(repoRoot, file)
  const source = stripComments(readFileSync(file, 'utf8'))

  for (const re of [IMPORT_RE, BARE_IMPORT_RE, REQUIRE_RE]) {
    re.lastIndex = 0
    // `matchAll` rather than a `while ((m = re.exec(...)))` loop: the same
    // walk over a global regex, without an assignment inside the condition.
    for (const match of source.matchAll(re)) {
      if (isBanned(match[1])) {
        violations.push(`${where}: imports platform module '${match[1]}'`)
      }
    }
  }

  for (const global of BANNED_GLOBALS) {
    const re = new RegExp(`(?<![.\\w$'"\`])${global}\\s*[.[(]`, 'g')
    if (re.test(source)) {
      violations.push(`${where}: uses platform global '${global}'`)
    }
  }
}

const manifest = JSON.parse(readFileSync(corePackageJson, 'utf8'))
for (const field of [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
]) {
  for (const name of Object.keys(manifest[field] ?? {})) {
    if (isBanned(name)) {
      violations.push(
        `packages/core/package.json: declares platform ${field} '${name}'`,
      )
    }
  }
}

if (violations.length > 0) {
  console.error('@kro/core is not platform-free:\n')
  for (const violation of violations) console.error(`  - ${violation}`)
  console.error(
    '\n@kro/core must stay free of react / next / DOM / Node so it can be shared by any host.',
  )
  process.exit(1)
}

console.log(
  '@kro/core is platform-free: no react/next/DOM/Node imports or globals.',
)
