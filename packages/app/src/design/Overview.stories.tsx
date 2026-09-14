import {
  KRO_CATALOG,
  KRO_CATEGORIES,
  formatAlsoKnownAs,
  kroEntriesByCategory,
  type KroCatalogEntry,
} from './catalog'
import { HigStage } from './hig/higStoryStage'
import { StoryGallery } from './storybook/storyGallery'

export default {
  title: 'Overview',
}

function CatalogTable({
  entries,
}: {
  readonly entries: readonly KroCatalogEntry[]
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
          <th style={{ padding: '8px 8px 8px 0' }}>Kro</th>
          <th style={{ padding: '8px 8px' }}>Purpose</th>
          <th style={{ padding: '8px 0 8px 8px' }}>Also known as</th>
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
            <td
              style={{
                padding: '10px 8px 10px 0',
                fontWeight: 600,
                whiteSpace: 'nowrap',
              }}
            >
              {entry.kroName}
            </td>
            <td
              style={{
                padding: '10px 8px',
                color: 'var(--kro-color-fore-secondary)',
              }}
            >
              {entry.purpose}
            </td>
            <td
              style={{
                padding: '10px 0 10px 8px',
                fontSize: 12,
                color: 'var(--kro-color-fore-secondary)',
              }}
            >
              {formatAlsoKnownAs(entry.alsoKnownAs)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const AllTitles = {
  name: 'Every Kro export · also-known-as',
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
        This is Kro&apos;s system. Compact desktop is the default density. HIG,
        Fluent 2, Material and Primer names are listed at the end of each row so
        a familiar title still finds the export. {KRO_CATALOG.length} exports.
      </p>
      {KRO_CATEGORIES.map((category) => (
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
          <CatalogTable entries={kroEntriesByCategory(category)} />
        </section>
      ))}
    </HigStage>
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => <StoryGallery>{AllTitles.render()}</StoryGallery>,
}
