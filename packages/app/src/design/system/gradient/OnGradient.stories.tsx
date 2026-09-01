import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { SurfaceCard } from '../../endeavor/SurfaceCard'
import { ICON_SIZE } from '../icons/icons'
import { DetailBackdrop } from './DetailBackdrop'
import { FieldSectionLabel, OnGradient, PageFieldEmpty } from './OnGradient'

export default {
  title: 'Design system/OnGradient',
}

function Field({
  children,
  height = 360,
}: {
  readonly children: ReactNode
  readonly height?: number
}) {
  return (
    <div style={{ position: 'relative', height, padding: 24 }}>
      <DetailBackdrop />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

export const LargeTitle = {
  name: 'Large title · full-strength snow',
  render: () => (
    <Field height={220}>
      <OnGradient as="h1" className="m-0 font-semibold text-3xl">
        My Day
      </OnGradient>
      <OnGradient as="p" className="mt-1 font-normal text-sm">
        Tuesday, 1 September
      </OnGradient>
    </Field>
  ),
}

export const SectionLabel = {
  name: 'Section label · outside a grouped card',
  render: () => (
    <Field>
      <FieldSectionLabel>Preferences</FieldSectionLabel>
      <SurfaceCard>
        <p style={{ margin: 0, color: 'var(--kro-color-fore)' }}>Appearance</p>
      </SurfaceCard>
    </Field>
  ),
}

export const EmptyDestination = {
  name: 'Empty destination · centred on the field',
  render: () => (
    <Field height={420}>
      <PageFieldEmpty
        icon={
          <Search
            size={ICON_SIZE.large}
            aria-hidden="true"
            className="kro-on-gradient"
          />
        }
        title="Find"
        description="Find is not built yet."
      />
    </Field>
  ),
}
