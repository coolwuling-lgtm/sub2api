/**
 * Pure, framework-agnostic helpers for the admin sidebar's grouped navigation.
 *
 * This module intentionally imports **nothing** from Vue, vue-i18n, or any icon
 * component: it only organizes already-resolved `NavItem` leaves into the four
 * business categories described in
 * `docs/superpowers/specs/2026-06-09-admin-menu-restructure-design.md` (§4).
 *
 * Keeping the structure assembly here (rather than inline in `AppSidebar.vue`)
 * makes it unit-testable and shrinks the diff surface against the upstream
 * `Wei-Shaw/sub2api` fork, which the design doc calls out as a goal.
 *
 * All exported functions are immutable: inputs are never mutated, and fresh
 * arrays/objects are returned.
 */

export interface NavItem {
  path: string
  label: string
  icon: unknown
  iconSvg?: string
  hideInSimpleMode?: boolean
  children?: NavItem[]
  /**
   * When true, the parent item only toggles expand/collapse and does NOT
   * navigate to its `path` (which is purely a stable key).
   */
  expandOnly?: boolean
  /**
   * Optional feature-flag getter. Returning `false` hides the item;
   * `undefined`/`true` shows it.
   */
  featureFlag?: () => boolean | undefined
}

/**
 * Stable keys for the four expandOnly category parents. They are used both as
 * the parent `NavItem.path` (the router never navigates to these — the parents
 * are expandOnly) and as the persisted expansion keys in localStorage.
 */
export const ADMIN_NAV_GROUP_KEYS = {
  operations: 'group:operations',
  supply: 'group:supply',
  revenue: 'group:revenue',
  system: 'group:system',
} as const

export type AdminNavGroupKey =
  (typeof ADMIN_NAV_GROUP_KEYS)[keyof typeof ADMIN_NAV_GROUP_KEYS]

/**
 * Canonical leaf ordering for each category (design doc §4). Pure data — no
 * i18n labels or icons live here. Leaf paths and feature flags are unchanged
 * from the original flat menu; only their grouping/order is defined.
 */
export const ADMIN_NAV_GROUP_MEMBERS: Record<AdminNavGroupKey, readonly string[]> = {
  [ADMIN_NAV_GROUP_KEYS.operations]: [
    '/admin/dashboard',
    '/admin/ops',
    '/admin/usage',
  ],
  [ADMIN_NAV_GROUP_KEYS.supply]: [
    '/admin/accounts',
    '/admin/channels/pricing',
    '/admin/channels/monitor',
    '/admin/proxies',
  ],
  [ADMIN_NAV_GROUP_KEYS.revenue]: [
    '/admin/subscriptions',
    '/admin/orders/plans',
    '/admin/orders',
    '/admin/orders/dashboard',
    '/admin/redeem',
    '/admin/promo-codes',
    '/admin/affiliates/invites',
    '/admin/affiliates/rebates',
    '/admin/affiliates/transfers',
  ],
  [ADMIN_NAV_GROUP_KEYS.system]: [
    '/admin/users',
    '/admin/groups',
    '/admin/risk-control',
    '/admin/announcements',
    '/admin/settings',
  ],
}

/**
 * A category parent's display configuration. `label`/`icon` are supplied by the
 * caller (so this module stays free of i18n/icon imports); `members` is the
 * ordered list of leaf paths that belong to the group.
 */
export interface AdminNavGroupConfig {
  /** Stable key used as the parent NavItem.path. */
  key: string
  /** i18n-resolved label (caller-provided). */
  label: string
  /** Icon component (caller-provided). */
  icon: unknown
  /** Ordered leaf paths belonging to this group. */
  members: readonly string[]
  /**
   * When true, any leaf not claimed by an earlier group (e.g. custom menu
   * items with `/custom/...` paths) is appended to the end of this group.
   * Exactly one group should set this — the "Users & System" group.
   */
  catchAll?: boolean
}

/**
 * Expand any expandOnly parents in `items` into their child leaves, keeping
 * childless items as-is. Returns a new flat array; never mutates the input.
 */
export function flattenAdminLeaves(items: readonly NavItem[]): NavItem[] {
  return items.flatMap((item) =>
    item.children && item.children.length > 0 ? [...item.children] : [item],
  )
}

/**
 * Assemble flat admin leaves into the four expandOnly category parents.
 *
 * - Leaves are matched into groups by `path`, ordered per `group.members`
 *   (the configured order wins over the input order).
 * - Leaves matched by no group are appended to the `catchAll` group's end.
 * - An expandOnly group with no surviving children is omitted (empty-group
 *   hiding — important once feature flags remove all of a group's leaves).
 *
 * Pure & immutable: leaves are referenced (not cloned) but never mutated, and
 * a brand new array of fresh parent objects is returned.
 */
export function groupAdminNav(
  leaves: readonly NavItem[],
  groups: readonly AdminNavGroupConfig[],
): NavItem[] {
  const byPath = new Map<string, NavItem>()
  for (const leaf of leaves) {
    if (!byPath.has(leaf.path)) byPath.set(leaf.path, leaf)
  }

  const claimed = new Set<string>()
  const result: NavItem[] = []

  for (const group of groups) {
    const children: NavItem[] = []

    for (const memberPath of group.members) {
      const leaf = byPath.get(memberPath)
      if (leaf && !claimed.has(memberPath)) {
        children.push(leaf)
        claimed.add(memberPath)
      }
    }

    if (group.catchAll) {
      for (const leaf of leaves) {
        if (!claimed.has(leaf.path)) {
          children.push(leaf)
          claimed.add(leaf.path)
        }
      }
    }

    // Empty-group hiding: skip a category whose leaves are all gone.
    if (children.length === 0) continue

    result.push({
      path: group.key,
      label: group.label,
      icon: group.icon,
      expandOnly: true,
      children,
    })
  }

  return result
}

/**
 * Parse the persisted expansion memory (a JSON string array of group keys).
 *
 * Returns:
 * - `null`  → no memory stored yet (caller should seed defaults), or the
 *             stored value was malformed/unusable.
 * - `string[]` → the remembered expanded group keys (possibly empty, meaning
 *             the user collapsed everything — which must be respected).
 */
export function parseStoredExpandedGroups(raw: string | null): string[] | null {
  if (raw === null) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((v): v is string => typeof v === 'string')
  } catch {
    return null
  }
}

/** Serialize expanded group keys for persistence. */
export function serializeExpandedGroups(groups: Iterable<string>): string {
  return JSON.stringify([...groups])
}

/**
 * Compute the default expansion set when there is no stored memory:
 * the always-open group (运营数据) plus whichever group contains the active
 * route, so the first paint shows the dashboard and the current page.
 *
 * The always-open key is only included if that group is actually present
 * (it may have been hidden by empty-group hiding).
 */
export function computeDefaultExpandedGroups(
  groups: readonly NavItem[],
  isActive: (path: string) => boolean,
  alwaysOpenKey: string,
): Set<string> {
  const result = new Set<string>()
  const present = new Set(groups.map((g) => g.path))

  if (present.has(alwaysOpenKey)) {
    result.add(alwaysOpenKey)
  }

  for (const group of groups) {
    if (group.children?.some((child) => isActive(child.path))) {
      result.add(group.path)
    }
  }

  return result
}

/**
 * Map a leaf path to the category group key that owns it, or `null` if the path
 * belongs to no category (e.g. a custom menu item). Derived from
 * `ADMIN_NAV_GROUP_MEMBERS` so the grouping stays single-sourced.
 */
export function groupKeyForLeafPath(path: string): AdminNavGroupKey | null {
  for (const key of Object.keys(ADMIN_NAV_GROUP_MEMBERS) as AdminNavGroupKey[]) {
    if (ADMIN_NAV_GROUP_MEMBERS[key].includes(path)) return key
  }
  return null
}

/**
 * Onboarding sidebar anchors (driver.js step `element` selectors) that now live
 * inside collapsible category groups. The tour highlights these by id, so while
 * it is active the owning group must be force-expanded — otherwise the anchored
 * child link is never rendered and the tour stalls waiting for it.
 *
 * Each selector maps to the leaf path the anchor is attached to (mirrors the
 * `pathToSelector` table in AppSidebar's `handleMenuItemClick`), and the owning
 * group is resolved from `ADMIN_NAV_GROUP_MEMBERS` — no group key is hardcoded.
 */
export const ONBOARDING_ANCHOR_PATHS: Readonly<Record<string, string>> = {
  '#sidebar-group-manage': '/admin/groups',
  '#sidebar-channel-manage': '/admin/accounts',
}

/**
 * Pure resolver: given onboarding anchor selectors, return the set of group keys
 * that must be expanded to reveal them. Unknown selectors (and anchors whose
 * path maps to no group) are ignored. Always returns a fresh Set (immutable).
 */
export function groupsForOnboardingAnchors(selectors: Iterable<string>): Set<string> {
  const result = new Set<string>()
  for (const selector of selectors) {
    const path = ONBOARDING_ANCHOR_PATHS[selector]
    if (!path) continue
    const key = groupKeyForLeafPath(path)
    if (key) result.add(key)
  }
  return result
}
