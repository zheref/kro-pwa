import { Calendar, Clock } from 'lucide-react'
import { PropertyPill } from './PropertyPill'

export default {
  title: 'Forms/Property pill',
  component: PropertyPill,
}

const noop = () => {}

/** A set, clearable property — the main button and its joined clear. */
export const SetAndClearable = {
  render: () => (
    <PropertyPill
      glyph={<Calendar size={12} aria-hidden />}
      label="Today"
      isSet
      isExpanded={false}
      density="compact"
      accessibilityLabel="Date: Today"
      onSelect={noop}
      onClear={noop}
      clearLabel="Clear date"
    />
  ),
}

/** An unset property — secondary label, no clear button. */
export const Unset = {
  render: () => (
    <PropertyPill
      glyph={<Clock size={12} aria-hidden />}
      label="No time"
      isSet={false}
      isExpanded={false}
      density="compact"
      accessibilityLabel="Time"
      onSelect={noop}
    />
  ),
}

/** The editor open — the selected fill spans both halves. */
export const ExpandedComfortable = {
  render: () => (
    <PropertyPill
      glyph={<Clock size={12} aria-hidden />}
      label="10:00"
      isSet
      isExpanded
      density="comfortable"
      accessibilityLabel="Time"
      onSelect={noop}
      onClear={noop}
      clearLabel="Clear time"
    />
  ),
}

/** A chord revealed at the leading edge — what holding Option shows. */
export const WithShortcutHint = {
  render: () => (
    <PropertyPill
      glyph={<Clock size={12} aria-hidden />}
      label="10:00"
      isSet
      isExpanded={false}
      density="compact"
      accessibilityLabel="Time"
      keyShortcuts="Alt+T"
      shortcutHint="⌥T"
      onSelect={noop}
      onClear={noop}
      clearLabel="Clear time"
    />
  ),
}
