import type { ReactNode } from 'react'
import {
  FLUENT_CATALOG,
  FLUENT_CATEGORIES,
  FLUENT_COMPONENTS_INDEX,
  type FluentCatalogEntry,
  fluentConflicts,
  fluentEntriesByCategory,
} from './catalog'
import { FluentRow, FluentStage } from './fluentStoryStage'
import { StoryGallery } from '../storybook/storyGallery'

export default {
  title: 'Fluent 2/Overview',
}

function Availability({ entry }: { readonly entry: FluentCatalogEntry }) {
  if (entry.availability === 'out-of-scope') {
    return (
      <span style={{ color: 'var(--kro-color-fore-secondary)' }}>
        Out of scope
      </span>
    )
  }
  if (entry.availability === 'conflict') {
    return (
      <span style={{ color: 'var(--kro-color-banner-warning)' }}>
        Conflict · {entry.kroName}
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
  readonly entries: readonly FluentCatalogEntry[]
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
              {entry.conflict ? <span> — {entry.conflict.note}</span> : null}
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

function Section({
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

const AllTitles = {
  name: 'Every Fluent 2 title · Kro availability',
  render: () => (
    <FluentStage>
      <p
        style={{
          margin: 0,
          fontSize: 13,
          color: 'var(--kro-color-fore-secondary)',
          maxWidth: '72ch',
        }}
      >
        Titles, use cases and variants follow{' '}
        <a href={FLUENT_COMPONENTS_INDEX}>Fluent 2 Web</a>. Paint, materials and
        type follow KroTokens and KroGlass. {FLUENT_CATALOG.length} titles.
      </p>
      {FLUENT_CATEGORIES.map((category) => (
        <Section key={category} title={category}>
          <CatalogTable entries={fluentEntriesByCategory(category)} />
        </Section>
      ))}
    </FluentStage>
  ),
}

const Implemented = {
  name: 'Implemented in this library',
  render: () => (
    <FluentStage>
      <CatalogTable
        entries={FLUENT_CATALOG.filter(
          (entry) => entry.availability === 'implemented',
        )}
      />
    </FluentStage>
  ),
}

const Conflicts = {
  name: 'Name conflicts · pick which export to keep',
  render: () => (
    <FluentStage>
      <FluentRow label="Flagged for a human decision">
        <span style={{ color: 'var(--kro-color-fore-secondary)' }}>
          Exact names collide with a live `@kro/app/design` export. Conceptual
          overlaps share a job under two titles. Nothing was deleted.
        </span>
      </FluentRow>
      <CatalogTable entries={fluentConflicts()} />
    </FluentStage>
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {AllTitles.render()}
      {Implemented.render()}
      {Conflicts.render()}
    </StoryGallery>
  ),
}
