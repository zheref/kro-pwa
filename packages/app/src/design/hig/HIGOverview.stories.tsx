import type { ReactNode } from 'react'
import {
  HIG_CATALOG,
  HIG_CATEGORIES,
  HIG_COMPONENTS_INDEX,
  type HigCatalogEntry,
  higEntriesByCategory,
} from './catalog'
import { HigStage } from './higStoryStage'
import { StoryGallery } from '../storybook/storyGallery'

export default {
  title: 'HIG/Overview',
}

function Availability({ entry }: { readonly entry: HigCatalogEntry }) {
  if (entry.availability === 'out-of-scope') {
    return (
      <span style={{ color: 'var(--kro-color-fore-secondary)' }}>
        Out of scope
      </span>
    )
  }
  if (entry.availability === 'existing') {
    return (
      <span style={{ color: 'var(--kro-role-status-ongoing)' }}>
        Existing · {entry.kroName}
      </span>
    )
  }
  return (
    <span style={{ color: 'var(--kro-role-status-pending)' }}>
      Kro · {entry.kroName}
    </span>
  )
}

function CatalogTable({
  entries,
}: {
  readonly entries: readonly HigCatalogEntry[]
}) {
  return (
    <table
      style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 14,
      }}
    >
      <thead>
        <tr
          style={{
            textAlign: 'left',
            color: 'var(--kro-color-fore-secondary)',
            fontSize: 12,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          <th style={{ padding: '8px 8px 8px 0' }}>Title</th>
          <th style={{ padding: '8px 8px' }}>Kro</th>
          <th style={{ padding: '8px 0 8px 8px' }}>Purpose</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr
            key={entry.slug}
            style={{
              borderTop: '1px solid var(--kro-color-hairline)',
              verticalAlign: 'top',
            }}
          >
            <td style={{ padding: '10px 8px 10px 0', fontWeight: 600 }}>
              {entry.title}
            </td>
            <td style={{ padding: '10px 8px', whiteSpace: 'nowrap' }}>
              <Availability entry={entry} />
            </td>
            <td
              style={{
                padding: '10px 0 10px 8px',
                color: 'var(--kro-color-fore-secondary)',
              }}
            >
              {entry.purpose}
              {entry.outOfScopeReason ? (
                <span> — {entry.outOfScopeReason}</span>
              ) : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const AllTitles = {
  name: 'Every HIG title · Kro availability',
  render: () => (
    <HigStage>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: 'var(--kro-color-fore-secondary)',
          maxWidth: '72ch',
        }}
      >
        Titles, use cases and layouts follow{' '}
        <a href={HIG_COMPONENTS_INDEX}>Apple&apos;s HIG Components</a>. Paint,
        materials and type follow KroTokens and KroGlass. {HIG_CATALOG.length}{' '}
        titles.
      </p>
      {HIG_CATEGORIES.map((category) => (
        <section key={category}>
          <h2
            style={{
              margin: '0 0 8px',
              fontSize: 16,
              fontWeight: 650,
            }}
          >
            {category}
          </h2>
          <CatalogTable entries={higEntriesByCategory(category)} />
        </section>
      ))}
    </HigStage>
  ),
}

const Implemented = {
  name: 'Implemented in this library',
  render: () => (
    <HigStage>
      <CatalogTable
        entries={HIG_CATALOG.filter(
          (entry) => entry.availability === 'implemented',
        )}
      />
    </HigStage>
  ),
}

const ExistingAndOutOfScope = {
  name: 'Already in the kit, or platform chrome a PWA cannot own',
  render: () => (
    <HigStage>
      <HigRowLike title="Existing primitives, restaged under HIG titles">
        <CatalogTable
          entries={HIG_CATALOG.filter(
            (entry) => entry.availability === 'existing',
          )}
        />
      </HigRowLike>
      <HigRowLike title="Out of scope">
        <CatalogTable
          entries={HIG_CATALOG.filter(
            (entry) => entry.availability === 'out-of-scope',
          )}
        />
      </HigRowLike>
    </HigStage>
  ),
}

function HigRowLike({
  title,
  children,
}: {
  readonly title: string
  readonly children: ReactNode
}) {
  return (
    <section>
      <h2
        style={{
          margin: '0 0 8px',
          fontSize: 16,
          fontWeight: 650,
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {AllTitles.render()}
      {Implemented.render()}
      {ExistingAndOutOfScope.render()}
    </StoryGallery>
  ),
}
