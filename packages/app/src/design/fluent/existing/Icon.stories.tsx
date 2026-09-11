import { ICON_SIZE, iconForSymbol } from '../../system/icons/icons'
import { StoryGallery } from '../../storybook/storyGallery'
import { FluentBothSchemes, FluentRow, FluentStage } from '../fluentStoryStage'

export default {
  title: 'Fluent 2/Content/Icon',
  component: IconGrid,
}

function IconGrid({ size }: { readonly size?: keyof typeof ICON_SIZE }) {
  const Check = iconForSymbol('checkmark.circle.fill')
  const Plus = iconForSymbol('plus')
  const Gear = iconForSymbol('gearshape')
  const Search = iconForSymbol('magnifyingglass')
  const px = ICON_SIZE[size ?? 'medium']
  return (
    <FluentRow label={size ?? 'medium'}>
      <Check size={px} aria-hidden="true" />
      <Plus size={px} aria-hidden="true" />
      <Gear size={px} aria-hidden="true" />
      <Search size={px} aria-hidden="true" />
    </FluentRow>
  )
}

const Default = {
  name: 'Regular · SF Symbol names onto lucide-react',
  render: () => (
    <FluentStage>
      <IconGrid size="medium" />
    </FluentStage>
  ),
}

const Sizes = {
  name: 'Sizes · small, medium, large',
  render: () => (
    <FluentStage>
      <IconGrid size="small" />
      <IconGrid size="medium" />
      <IconGrid size="large" />
    </FluentStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark',
  render: () => (
    <FluentBothSchemes>
      <IconGrid size="medium" />
    </FluentBothSchemes>
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {Default.render()}
      {Sizes.render()}
      {BothSchemes.render()}
    </StoryGallery>
  ),
}
