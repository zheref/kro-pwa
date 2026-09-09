import { DesignSystemPageClient } from './DesignSystemPageClient'

/**
 * `/storybook` — the Design System destination.
 *
 * A passive Server Component (`RC-38`): it renders the client wrapper and
 * nothing else. No hook, no store read, no markup. The gallery lives in
 * `packages/app`; this file is the shell's one-line mount.
 *
 * The sidebar row is development-only (`isDevelopment`). The route itself
 * stays in the tree the same way `/tweak` does — a production paste still
 * mounts, it just has no navigation chrome pointing here.
 */
export default function StorybookRoute() {
  return <DesignSystemPageClient />
}
