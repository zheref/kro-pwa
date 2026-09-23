/**
 * `@kro/app/design` — the Kro design system.
 *
 * Layout:
 *   `system/tokens/`     KroTokens as CSS custom properties plus the typed
 *                        surface over them, the runtime reader and the accent
 *                        hook. `tokens.css` is the single source of truth for
 *                        every colour value; the contrast suite parses it.
 *   `system/glass/`      KroGlass — the zheref.io material, including the
 *                        Safari fixed-element fix and every fallback.
 *   `system/gradient/`   the indigoGrape header slab.
 *   `system/motion/`     durations, easings, the spring ports, reduced motion.
 *   `system/primitives/` vendored shadcn/ui, themed on the tokens.
 *   `system/icons/`      lucide-react and the SF Symbols mapping.
 *   `hig/`               Apple HIG titles, realised in Kro materials.
 *   `fluent/`            Fluent 2 ideas folded into Kro names, or unique
 *                        controls that HIG did not have.
 *   `catalog.ts`         The one Kro catalog. Aliases live there.
 *
 * NOT exported here: `system/tokens/tokenSource.ts`. It reads the stylesheet
 * from disk with `node:fs` and belongs to the test tier — exporting it would
 * drag Node built-ins into the browser bundle. The browser equivalent is
 * `readToken`, which reports the *computed* value and therefore answers for
 * the live theme.
 *
 * Styles are not imported from TypeScript either. The shell imports
 * `system/styles.css` once from `globals.css`, so a component never
 * side-effect-imports CSS and the bundler has one entry point to reason about.
 *
 * `RC-14`: nothing under `design/` imports react-redux or a slice. These are
 * presentation only — state arrives as props.
 */

// Tokens
export {
  COLOR_ROLES,
  COLOR_ROLE_VARS,
  DISABLED_OPACITY,
  DISABLED_OPACITY_VAR,
  RADIUS_VARS,
  SEMANTIC_ROLES,
  SEMANTIC_ROLE_VARS,
  SHADOW_VARS,
  SIZE_VARS,
  SPACING_VARS,
  type ColorRole,
  type RadiusRole,
  type SemanticRole,
  type ShadowRole,
  type SizeRole,
  type SpacingRole,
  colorVar,
  radiusVar,
  semanticVar,
  shadowVar,
  spacingVar,
} from './system/tokens/roles'
export {
  THEME_ATTRIBUTE,
  type ResolvedTheme,
  type ThemePreference,
  applyAppearanceValues,
  readColorRole,
  readSemanticRole,
  readToken,
  resolveTheme,
  setPalettePreference,
  setThemePreference,
} from './system/tokens/readToken'
export {
  APP_PALETTES,
  APP_PALETTE_IDS,
  DEFAULT_APP_PALETTE,
  PALETTE_ATTRIBUTE,
  type AppPaletteId,
  type AppPaletteRamp,
  type AppPaletteSpec,
  appPaletteNamed,
} from './system/tokens/appPalette'
export {
  AA_NON_TEXT,
  AA_TEXT,
  type Rgb,
  composite,
  contrastRatio,
  formatRatio,
  parseColor,
  ratioBetween,
  relativeLuminance,
  withAlpha,
} from './system/tokens/contrast'
export {
  ACCENT_CONTRAST_FLOOR,
  ACCENT_VAR,
  ON_ACCENT_VAR,
  type AccentDecision,
  type UseAccentColorOptions,
  applyAccentColor,
  decideAccent,
  useAccentColor,
} from './system/tokens/useAccentColor'

// Motion
export {
  EASING_VARS,
  MOTION_MS,
  MOTION_VARS,
  SPRINGS,
  type Easing,
  type MotionDuration,
  durationVar,
  easingVar,
  prefersReducedMotion,
  springDisplacement,
} from './system/motion/motion'

// Materials
export {
  type GlassMaterial,
  type GlassTint,
  type GlassSurfaceProps,
  GlassSurface,
} from './system/glass/GlassSurface'
export {
  type GlassPanelProps,
  type GlassPanelKind,
  GlassPanel,
} from './system/glass/GlassPanel'
export { startGlassLight } from './system/glass/glassLight'
export {
  type GradientBackdropProps,
  type GradientContentProps,
  type GradientStyle,
  GradientBackdrop,
  GradientContent,
  LARGE_TITLE_TRAILING_RADIUS_PX,
  TITLE_SLAB_HOST_SELECTOR,
} from './system/gradient/GradientBackdrop'
export {
  type DetailBackdropProps,
  DetailBackdrop,
} from './system/gradient/DetailBackdrop'
export {
  type OnGradientProps,
  type PageFieldEmptyProps,
  FieldSectionLabel,
  OnGradient,
  PageFieldEmpty,
} from './system/gradient/OnGradient'

// Icons
export {
  ICON_SIZE,
  SF_SYMBOL_TO_LUCIDE,
  type IconSize,
  type LucideIcon,
  type SfSymbolName,
  iconForSymbol,
} from './system/icons/icons'

// Primitives
export { cn } from './system/utils/cn'
export {
  type ControlDensity,
  DEFAULT_CONTROL_DENSITY,
  DENSITY_BOX,
  DENSITY_FIELD,
  DENSITY_HIT,
  DENSITY_ROW,
  DENSITY_TYPE,
  buttonSizeForDensity,
  controlDensity,
  controlMinSizeVar,
  iconButtonSizeForDensity,
} from './system/density'
export {
  type ButtonProps,
  Button,
  buttonVariants,
} from './system/primitives/button'
export { type InputProps, Input } from './system/primitives/input'
export {
  type DialogContentProps,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from './system/primitives/dialog'
export {
  type SheetContentProps,
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
  sheetVariants,
} from './system/primitives/sheet'
export {
  POPOVER_SIZE,
  type PopoverSizeName,
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from './system/primitives/popover'
export {
  type DropdownMenuItemProps,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuTrigger,
} from './system/primitives/dropdown-menu'
export {
  type TabsListProps,
  type TabsTriggerProps,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './system/primitives/tabs'

export * from './hig'
export * from './fluent'
export {
  KRO_CATALOG,
  KRO_CATEGORIES,
  formatAlsoKnownAs,
  kroEntriesByCategory,
  kroEntryNamed,
  type AlsoKnownAs,
  type KroCatalogEntry,
  type KroCategory,
  type NameSource,
} from './catalog'
