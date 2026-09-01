#!/usr/bin/env node
/**
 * UZF boundary check for `packages/app` — wired as `@kro/app`'s `lint` task.
 *
 * The react-uzf-v1 rules that matter most are the ones a component can break by
 * accident: importing a Service, building a second store, or calling
 * `useSelector` straight from `react-redux`. Review catches those inconsistently,
 * so they are checked here instead — this is what turns "components cannot fetch"
 * from a convention into a structural fact (issue #5, acceptance criterion 2).
 *
 * Checked:
 *   RC-22  `configureStore(` appears only in `src/library/store.ts`.
 *   RC-10  `react-redux` is imported only by `src/library/hooks.ts` and
 *          `src/library/StoreProvider.tsx`.
 *   RC-6   a Service module is imported only by `src/library/store.ts` (which
 *          assembles `ThunkExtra`) and by test/mock files.
 *   RC-3   `fetch(` is called only inside `src/services/**`.
 *   RC-1   `createSlice(` appears only in a `…Feature.ts` file.
 *   RC-3   `createAsyncThunk(` appears only in a `…Producer.ts` file.
 *   RC-5   `createSelector(` appears only in a `…Selectors.ts` file.
 *   RC-40  nothing in this package imports `next/*` — the shell owns Next.js.
 *
 * Run: `node packages/app/scripts/check-uzf-boundaries.mjs` (cwd may be anywhere).
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = join(packageRoot, 'src')

const STORE_FILE = 'src/library/store.ts'
const REACT_REDUX_FILES = [
  'src/library/hooks.ts',
  'src/library/StoreProvider.tsx',
]

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]/g
const BARE_IMPORT_RE = /(?:^|\n)\s*import\s*['"]([^'"]+)['"]/g

function collectFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...collectFiles(full))
    else if (/\.(ts|tsx)$/.test(full)) out.push(full)
  }
  return out
}

/** Strips line and block comments so commented-out code is not flagged. */
function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

function importsOf(source) {
  const found = []
  for (const re of [IMPORT_RE, BARE_IMPORT_RE]) {
    re.lastIndex = 0
    // `matchAll` rather than a `while ((m = re.exec(...)))` loop: the same
    // walk over a sticky/global regex, without an assignment inside the
    // condition. Both regexes are `g`, which is what `matchAll` requires.
    for (const match of source.matchAll(re)) found.push(match[1])
  }
  return found
}

const isTestFile = (where) =>
  /(\.test\.tsx?|\.stories\.tsx?|\.mocks\.ts)$/.test(where) ||
  where.includes('/__tests__/')
const isServiceFile = (where) => where.startsWith('src/services/')
const isServiceSpecifier = (specifier) =>
  /(^|\/)services\//.test(specifier) || /Service(\.js)?$/.test(specifier)

const violations = []

for (const file of collectFiles(sourceRoot)) {
  const where = relative(packageRoot, file).split('\\').join('/')
  const source = stripComments(readFileSync(file, 'utf8'))

  if (where !== STORE_FILE && /\bconfigureStore\s*\(/.test(source)) {
    violations.push(
      `${where}: calls configureStore() — the only store path is makeStore() (RC-22)`,
    )
  }

  if (!isServiceFile(where) && /(?<![.\w$])fetch\s*\(/.test(source)) {
    violations.push(
      `${where}: calls fetch() outside services/ — go through a Service (RC-3)`,
    )
  }

  if (/\bcreateSlice\s*\(/.test(source) && !where.endsWith('Feature.ts')) {
    violations.push(
      `${where}: calls createSlice() outside a …Feature.ts file (RC-1)`,
    )
  }

  if (
    /\bcreateAsyncThunk\s*\(/.test(source) &&
    !where.endsWith('Producer.ts')
  ) {
    violations.push(
      `${where}: calls createAsyncThunk() outside a …Producer.ts file (RC-3)`,
    )
  }

  if (/\bcreateSelector\s*\(/.test(source) && !where.endsWith('Selectors.ts')) {
    violations.push(
      `${where}: calls createSelector() outside a …Selectors.ts file (RC-5)`,
    )
  }

  for (const specifier of importsOf(source)) {
    if (specifier === 'next' || specifier.startsWith('next/')) {
      violations.push(
        `${where}: imports '${specifier}' — Next.js belongs to apps/web (RC-40)`,
      )
    }

    if (specifier === 'react-redux' && !REACT_REDUX_FILES.includes(where)) {
      violations.push(
        `${where}: imports 'react-redux' — use useAppSelector/useAppDispatch from library/hooks (RC-10)`,
      )
    }

    if (
      isServiceSpecifier(specifier) &&
      where !== STORE_FILE &&
      !isServiceFile(where) &&
      !isTestFile(where)
    ) {
      violations.push(
        `${where}: imports the Service module '${specifier}' — Services reach a Producer only through ThunkExtra (RC-6, RC-21)`,
      )
    }
  }
}

if (violations.length > 0) {
  console.error('@kro/app breaks a UZF boundary:\n')
  for (const violation of violations) console.error(`  - ${violation}`)
  console.error(
    '\nSee the react-uzf-v1 handbook rules cited above; every one of these has a sanctioned route.',
  )
  process.exit(1)
}

console.log(
  '@kro/app holds its UZF boundaries: one store, one hooks surface, services behind DI.',
)
