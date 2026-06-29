import type { DashboardWidgetCfg, DashboardWidgetSize } from './api'

/** Metadata describing a dashboard widget: its id, label, the sizes it allows,
 *  and the defaults used when no saved layout exists (or a new widget appears
 *  after an update). */
export interface WidgetMeta {
  id: string
  label: string
  /** Short hint shown in the customizer. */
  hint?: string
  /** Allowed size presets, smallest → largest. */
  sizes: DashboardWidgetSize[]
  defaultSize: DashboardWidgetSize
  /** Whether the widget is shown by default (default true). */
  defaultVisible?: boolean
}

/** Tailwind column-span for each size in a 12-column grid (applied at lg+). */
export const SIZE_SPAN: Record<DashboardWidgetSize, string> = {
  S: 'lg:col-span-4',
  M: 'lg:col-span-6',
  L: 'lg:col-span-12'
}

export const SIZE_LABEL: Record<DashboardWidgetSize, string> = {
  S: 'Small',
  M: 'Medium',
  L: 'Wide'
}

/** Merge a saved layout with the widget catalogue: keep the saved order/sizes
 *  for widgets that still exist, then append any new widgets (added in an
 *  update) with their defaults. Returns a complete, ordered config. */
export function resolveLayout(meta: WidgetMeta[], saved?: DashboardWidgetCfg[]): DashboardWidgetCfg[] {
  const metaById = new Map(meta.map((m) => [m.id, m]))
  const result: DashboardWidgetCfg[] = []
  const seen = new Set<string>()
  for (const w of saved ?? []) {
    const m = metaById.get(w.id)
    if (!m || seen.has(w.id)) continue
    // Clamp a stale size back to something the widget allows.
    const size = m.sizes.includes(w.size) ? w.size : m.defaultSize
    result.push({ id: w.id, visible: w.visible, size })
    seen.add(w.id)
  }
  for (const m of meta) {
    if (seen.has(m.id)) continue
    result.push({ id: m.id, visible: m.defaultVisible !== false, size: m.defaultSize })
  }
  return result
}

/** The default layout (used by the "Reset" button in the customizer). */
export function defaultLayout(meta: WidgetMeta[]): DashboardWidgetCfg[] {
  return meta.map((m) => ({ id: m.id, visible: m.defaultVisible !== false, size: m.defaultSize }))
}

/** Cycle a widget to its next allowed size (wraps around). */
export function nextSize(meta: WidgetMeta, current: DashboardWidgetSize): DashboardWidgetSize {
  const i = meta.sizes.indexOf(current)
  return meta.sizes[(i + 1) % meta.sizes.length]
}
