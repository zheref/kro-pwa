/**
 * `KroChip` across its emphases, and across every semantic role the app has.
 *
 * The `EveryRole` story is the gallery half of the design system's contrast
 * contract: the same set the suite measures, drawn. If a chip in it looks
 * unreadable, the suite is wrong, not the eye.
 */

// `SEMANTIC_ROLES` from `roles.ts`, never `CHIP_ROLES` from
// `contrastContracts.ts`: the latter imports `tokenSource`, which reads the
// stylesheet with `node:fs` and belongs to the test tier. The two lists are the
// same set — `contrastContracts` builds its own from the same map.
import { SEMANTIC_ROLES } from '../system/tokens/roles'
import { ChipFlow, KroChip, colorTint, semanticTint } from './KroChip'
import { BothSchemes, Cell, Stage } from './storyStage'

export default {
  title: 'Endeavor/KroChip',
  component: KroChip,
}

export const Emphasis = {
  name: 'Emphasis · prominent, soft, outline',
  render: () => (
    <Stage>
      <Cell label="prominent — the one identity chip on a surface">
        <KroChip
          title="Task"
          icon="checkmark.circle.fill"
          tint={semanticTint('kindTask')}
          emphasis="prominent"
        />
      </Cell>
      <Cell label="soft — the workhorse">
        <KroChip title="Pending" icon="circle" tint={semanticTint('statusPending')} />
      </Cell>
      <Cell label="outline — de-emphasised or unavailable">
        <KroChip
          title="Not attached"
          icon="xmark"
          tint={semanticTint('chipNeutral')}
          emphasis="outline"
        />
      </Cell>
      <Cell label="small">
        <KroChip
          title="Engaging"
          icon="tag"
          tint={colorTint('badgeIndigo')}
          size="small"
        />
      </Cell>
    </Stage>
  ),
}

export const EveryRole = {
  name: 'Every semantic role',
  render: () => (
    <Stage>
      <ChipFlow>
        {SEMANTIC_ROLES.map((role) => (
          <KroChip key={role} title={role} icon="tag" tint={semanticTint(role)} size="small" />
        ))}
      </ChipFlow>
    </Stage>
  ),
}

export const Wrapping = {
  name: 'ChipFlow · wraps rather than scrolling off-screen',
  render: () => (
    <Stage width={360}>
      <ChipFlow>
        {[
          'Engaging',
          'On desk',
          'Session',
          'Deep work',
          'Quarterly',
          'Finance',
          '朝ごはん',
          'Reconciliation',
        ].map((tag) => (
          <KroChip key={tag} title={tag} icon="tag" tint={colorTint('payneGray')} size="small" />
        ))}
      </ChipFlow>
    </Stage>
  ),
}

export const BothThemes = {
  name: 'Both schemes',
  render: () => (
    <BothSchemes>
      <ChipFlow>
        <KroChip
          title="Event"
          icon="calendar"
          tint={semanticTint('kindEvent')}
          emphasis="prominent"
        />
        <KroChip
          title="Ongoing"
          icon="play.circle.fill"
          tint={semanticTint('statusOngoing')}
        />
        <KroChip
          title="Unavailable"
          icon="xmark"
          tint={semanticTint('chipNeutral')}
          emphasis="outline"
        />
      </ChipFlow>
    </BothSchemes>
  ),
}
