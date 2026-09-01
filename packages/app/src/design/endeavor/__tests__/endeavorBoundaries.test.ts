/**
 * `RC-14`, proved by reading the directory rather than by trusting review.
 *
 * The package-wide check (`packages/app/scripts/check-uzf-boundaries.mjs`, wired
 * as `@kro/app`'s `lint` task) already walks every file under `src/` and would
 * fail on a `react-redux` import or a Service import from here — that rule needs
 * no path added, and none is added. What it does NOT check is the other half of
 * `RC-14`: *"A Component (under `design/`) importing anything from react-redux,
 * A SLICE, OR A PRODUCER."* A slice lives in a `…Feature.ts` and a Producer in a
 * `…Producer.ts`, and nothing in the package check knows those are off-limits to
 * a component.
 *
 * So this is that half, scoped to this kit's lane and written as a test rather
 * than as another lint script for two reasons: it runs inside `make test`, which
 * is the gate that executes on every commit; and a failure names the file and
 * the import, which a grep-based lint message does not.
 *
 * It also asserts the one thing this kit IS allowed to reach for — `@kro/core` —
 * stays inside the two sanctioned uses, so "the design tier may import the
 * domain" cannot quietly widen into "the design tier may do anything".
 */

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const KIT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

function collect(dir: string): string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...collect(full))
    else if (/\.(ts|tsx)$/.test(full)) out.push(full)
  }
  return out
}

/** Strips comments, so a rule quoted in a doc-block is not a violation of it. */
function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

const IMPORT_RE = /(?:^|\n)\s*(?:import|export)[\s\S]*?from\s*['"]([^'"]+)['"]/g

function importsOf(source: string): string[] {
  const found: string[] = []
  IMPORT_RE.lastIndex = 0
  let match: RegExpExecArray | null = IMPORT_RE.exec(source)
  while (match !== null) {
    found.push(match[1] as string)
    match = IMPORT_RE.exec(source)
  }
  return found
}

const FILES = collect(KIT_ROOT).map((file) => ({
  where: relative(KIT_ROOT, file).split('\\').join('/'),
  source: stripComments(readFileSync(file, 'utf8')),
}))

const isTestOrStory = (where: string) =>
  /\.(test|stories)\.tsx?$/.test(where) || where.startsWith('__tests__/')

describe('the endeavor kit holds the RC-14 boundary', () => {
  it('reads more than a handful of files, so a broken walk cannot pass vacuously', () => {
    expect(FILES.length).toBeGreaterThan(20)
  })

  it('imports react-redux nowhere', () => {
    const offenders = FILES.filter(({ source }) =>
      importsOf(source).some((specifier) => specifier === 'react-redux'),
    ).map(({ where }) => where)

    expect(offenders).toEqual([])
  })

  it('imports no slice, Producer, Shifter or Selector module', () => {
    const offenders: string[] = []
    for (const { where, source } of FILES) {
      for (const specifier of importsOf(source)) {
        if (/(Feature|Producer|Shifters|Selectors)(\.js)?$/.test(specifier)) {
          offenders.push(`${where} -> ${specifier}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('imports no Service module and no store', () => {
    const offenders: string[] = []
    for (const { where, source } of FILES) {
      for (const specifier of importsOf(source)) {
        if (
          /(^|\/)services\//.test(specifier) ||
          /Service(\.js)?$/.test(specifier)
        ) {
          offenders.push(`${where} -> ${specifier}`)
        }
        if (/(^|\/)library\/(store|hooks|StoreProvider)$/.test(specifier)) {
          offenders.push(`${where} -> ${specifier}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })

  it('reaches into the feature tier nowhere', () => {
    const offenders: string[] = []
    for (const { where, source } of FILES) {
      for (const specifier of importsOf(source)) {
        if (specifier.includes('features/'))
          offenders.push(`${where} -> ${specifier}`)
      }
    }

    expect(offenders).toEqual([])
  })

  it('imports `next/*` nowhere — the shell owns Next.js (RC-40)', () => {
    const offenders: string[] = []
    for (const { where, source } of FILES) {
      for (const specifier of importsOf(source)) {
        if (specifier === 'next' || specifier.startsWith('next/')) {
          offenders.push(`${where} -> ${specifier}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })
})

describe('the sanctioned `@kro/core` reach stays narrow', () => {
  it('reads the DOMAIN type `Endeavor` in exactly one module — the card-model seam', () => {
    // Canon's own `EndeavorCardModel.init(from:)` boundary. Everything else in
    // the kit takes the view model, which is what lets a caller that already has
    // one render without touching the domain at all.
    const readers = FILES.filter(
      ({ where, source }) =>
        !isTestOrStory(where) &&
        /import\s+type\s*\{[^}]*\bEndeavor\b[^}]*\}\s*from\s*'@kro\/core'/.test(
          source,
        ),
    ).map(({ where }) => where)

    expect(readers).toEqual(['endeavorCardModel.ts'])
  })

  it('keeps every other `@kro/core` import to the vista/enum vocabulary', () => {
    const allowed = new Set([
      'EndeavorCapabilities',
      'EndeavorOperation',
      'EndeavorOperationBinding',
      'EndeavorOperationBinding[]',
      'OperationTint',
      'OperationRole',
      'EndeavorHost',
      'EndeavorKind',
      'EndeavorStatus',
      'assertNever',
      'endeavorHostIcon',
      'bindingsForGesture',
      'effectiveTintOf',
      'EndeavorsVistas',
      'fixedEndeavorsVistas',
      'Endeavor',
    ])

    const offenders: string[] = []
    for (const { where, source } of FILES) {
      if (isTestOrStory(where)) continue
      const blocks = source.matchAll(
        /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*'@kro\/core'/g,
      )
      for (const [, names] of blocks) {
        for (const raw of (names as string).split(',')) {
          const name = raw.replace(/^\s*type\s+/, '').trim()
          if (name !== '' && !allowed.has(name))
            offenders.push(`${where}: ${name}`)
        }
      }
    }

    expect(offenders).toEqual([])
  })
})
