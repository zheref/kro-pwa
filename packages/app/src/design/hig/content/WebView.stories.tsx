import { WebView } from './WebView'
import { StoryGallery } from '../../storybook/storyGallery'
import {
  HigBothSchemes,
  HigDensities,
  HigRow,
  HigStage,
} from '../higStoryStage'

export default {
  title: 'Content/Web view',
  component: WebView,
}

const NOTES = '<p>Session notes</p>'

const SessionNotes = {
  name: 'Session notes · srcDoc, no network',
  render: () => (
    <HigStage>
      <HigRow label="Restricted frame">
        <WebView title="Session notes" srcDoc={NOTES} />
      </HigRow>
    </HigStage>
  ),
}

const PreviewChrome = {
  name: 'Preview · the title bar names the embed',
  render: () => (
    <HigStage>
      <HigRow label="Capture preview">
        <WebView
          title="Morning block"
          srcDoc="<p>Focus sounds on. Two habits closed.</p>"
        />
      </HigRow>
    </HigStage>
  ),
}

const BothSchemes = {
  name: 'Light and dark · glass still frames the document',
  render: () => (
    <HigBothSchemes gradient>
      <HigRow label="Over the field">
        <WebView title="Session notes" srcDoc={NOTES} />
      </HigRow>
    </HigBothSchemes>
  ),
}

const Densities = {
  name: 'Densities · compact default, comfortable for mobile',
  render: () => (
    <HigDensities
      render={(density) => (
        <WebView density={density} title="Session notes" srcDoc={NOTES} />
      )}
    />
  ),
}

export const Gallery = {
  tags: ['showcase'],
  render: () => (
    <StoryGallery>
      {SessionNotes.render()}
      {PreviewChrome.render()}
      {BothSchemes.render()}
      {Densities.render()}
    </StoryGallery>
  ),
}
