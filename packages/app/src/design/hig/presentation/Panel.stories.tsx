import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'
import { Panel } from './Panel'
import { StoryGallery } from '../../storybook/storyGallery'

export default {
  title: 'Surfaces/Panel',
  component: Panel,
}

function Property({
  label,
  value,
}: {
  readonly label: string
  readonly value: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        gap: 12,
        minHeight: 44,
        alignItems: 'center',
        borderBottom: '1px solid var(--kro-color-hairline)',
      }}
    >
      <span style={{ color: 'var(--kro-color-fore-secondary)', fontSize: 13 }}>
        {label}
      </span>
      <span style={{ color: 'var(--kro-color-fore)', fontWeight: 600 }}>
        {value}
      </span>
    </div>
  )
}

const EndeavorProperties = {
  name: 'Endeavor properties · labelled rows',
  render: () => (
    <HigStage gradient>
      <HigRow label="Inspector">
        <Panel title="Endeavor properties" onClose={() => {}}>
          <Property label="Kind" value="Task" />
          <Property label="When" value="Today" />
          <Property label="Status" value="Pending" />
          <Property label="Points" value="240" />
        </Panel>
      </HigRow>
    </HigStage>
  ),
}

const WithoutClose = {
  name: 'Without close · an accessory that stays',
  render: () => (
    <HigStage>
      <HigRow label="No dismiss">
        <Panel title="Session">
          <Property label="Length" value="25 minutes" />
          <Property label="Against" value="Write the KroTokens port" />
        </Panel>
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · the pane still reads',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="Properties">
        <Panel title="Endeavor properties" onClose={() => {}}>
          <Property label="Kind" value="Task" />
          <Property label="When" value="Today" />
        </Panel>
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <Panel density={density} title="Endeavor properties" onClose={() => {}}>
          <Property label="Kind" value="Task" />
          <Property label="When" value="Today" />
        </Panel>
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {EndeavorProperties.render()}
      {WithoutClose.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
