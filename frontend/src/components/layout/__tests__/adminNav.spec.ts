import { describe, expect, it } from 'vitest'

import {
  ADMIN_NAV_GROUP_KEYS,
  ADMIN_NAV_GROUP_MEMBERS,
  ONBOARDING_ANCHOR_PATHS,
  computeDefaultExpandedGroups,
  flattenAdminLeaves,
  groupAdminNav,
  groupKeyForLeafPath,
  groupsForOnboardingAnchors,
  parseStoredExpandedGroups,
  serializeExpandedGroups,
  type AdminNavGroupConfig,
  type NavItem,
} from '../adminNav'

// Lightweight leaf factory — the pure functions never touch icon/i18n, so a
// string icon placeholder is enough for structural assertions.
function leaf(path: string, label = path): NavItem {
  return { path, label, icon: `icon:${path}` }
}

// Build the four canonical group configs from the exported member ordering,
// attaching fake labels/icons the way AppSidebar.vue does with real ones.
function buildConfigs(): AdminNavGroupConfig[] {
  return [
    {
      key: ADMIN_NAV_GROUP_KEYS.operations,
      label: 'Operations',
      icon: 'icon:ops',
      members: ADMIN_NAV_GROUP_MEMBERS[ADMIN_NAV_GROUP_KEYS.operations],
    },
    {
      key: ADMIN_NAV_GROUP_KEYS.supply,
      label: 'Supply',
      icon: 'icon:supply',
      members: ADMIN_NAV_GROUP_MEMBERS[ADMIN_NAV_GROUP_KEYS.supply],
    },
    {
      key: ADMIN_NAV_GROUP_KEYS.revenue,
      label: 'Revenue',
      icon: 'icon:revenue',
      members: ADMIN_NAV_GROUP_MEMBERS[ADMIN_NAV_GROUP_KEYS.revenue],
    },
    {
      key: ADMIN_NAV_GROUP_KEYS.system,
      label: 'System',
      icon: 'icon:system',
      members: ADMIN_NAV_GROUP_MEMBERS[ADMIN_NAV_GROUP_KEYS.system],
      catchAll: true,
    },
  ]
}

// All leaves named by the four canonical groups, in arbitrary (shuffled) order.
function allLeaves(): NavItem[] {
  const paths = Object.values(ADMIN_NAV_GROUP_MEMBERS).flat()
  // shuffle deterministically (reverse) to prove ordering comes from config
  return paths.slice().reverse().map((p) => leaf(p))
}

describe('groupAdminNav', () => {
  it('classifies every leaf into the four expandOnly category parents', () => {
    const result = groupAdminNav(allLeaves(), buildConfigs())

    expect(result.map((g) => g.path)).toEqual([
      ADMIN_NAV_GROUP_KEYS.operations,
      ADMIN_NAV_GROUP_KEYS.supply,
      ADMIN_NAV_GROUP_KEYS.revenue,
      ADMIN_NAV_GROUP_KEYS.system,
    ])
    for (const group of result) {
      expect(group.expandOnly).toBe(true)
      expect(group.children && group.children.length).toBeGreaterThan(0)
    }
  })

  it('orders children by the configured member order, not the input order', () => {
    const result = groupAdminNav(allLeaves(), buildConfigs())
    const revenue = result.find((g) => g.path === ADMIN_NAV_GROUP_KEYS.revenue)

    expect(revenue?.children?.map((c) => c.path)).toEqual([
      '/admin/subscriptions',
      '/admin/orders/plans',
      '/admin/orders',
      '/admin/orders/dashboard',
      '/admin/redeem',
      '/admin/promo-codes',
      '/admin/affiliates/invites',
      '/admin/affiliates/rebates',
      '/admin/affiliates/transfers',
    ])
  })

  it('places operations / supply / system members correctly', () => {
    const result = groupAdminNav(allLeaves(), buildConfigs())
    const byKey = (k: string) => result.find((g) => g.path === k)

    expect(byKey(ADMIN_NAV_GROUP_KEYS.operations)?.children?.map((c) => c.path)).toEqual([
      '/admin/dashboard',
      '/admin/ops',
      '/admin/usage',
    ])
    expect(byKey(ADMIN_NAV_GROUP_KEYS.supply)?.children?.map((c) => c.path)).toEqual([
      '/admin/accounts',
      '/admin/channels/pricing',
      '/admin/channels/monitor',
      '/admin/proxies',
    ])
    expect(byKey(ADMIN_NAV_GROUP_KEYS.system)?.children?.map((c) => c.path)).toEqual([
      '/admin/users',
      '/admin/groups',
      '/admin/risk-control',
      '/admin/announcements',
      '/admin/settings',
    ])
  })

  it('hides an expandOnly group whose leaves are all absent (feature-flagged off)', () => {
    // Drop every revenue leaf to simulate payment + affiliate flags disabled.
    const revenueMembers = new Set(ADMIN_NAV_GROUP_MEMBERS[ADMIN_NAV_GROUP_KEYS.revenue])
    const leaves = allLeaves().filter((l) => !revenueMembers.has(l.path))

    const result = groupAdminNav(leaves, buildConfigs())

    expect(result.map((g) => g.path)).not.toContain(ADMIN_NAV_GROUP_KEYS.revenue)
    expect(result.map((g) => g.path)).toEqual([
      ADMIN_NAV_GROUP_KEYS.operations,
      ADMIN_NAV_GROUP_KEYS.supply,
      ADMIN_NAV_GROUP_KEYS.system,
    ])
  })

  it('keeps a partially-populated group with only the surviving leaves', () => {
    // Only channel monitor hidden inside supply.
    const leaves = allLeaves().filter((l) => l.path !== '/admin/channels/monitor')
    const result = groupAdminNav(leaves, buildConfigs())
    const supply = result.find((g) => g.path === ADMIN_NAV_GROUP_KEYS.supply)

    expect(supply?.children?.map((c) => c.path)).toEqual([
      '/admin/accounts',
      '/admin/channels/pricing',
      '/admin/proxies',
    ])
  })

  it('appends leaves matched by no group (custom menu items) to the catch-all system group end', () => {
    const leaves = [
      ...allLeaves(),
      leaf('/custom/1', 'Custom One'),
      leaf('/custom/2', 'Custom Two'),
    ]
    const result = groupAdminNav(leaves, buildConfigs())
    const system = result.find((g) => g.path === ADMIN_NAV_GROUP_KEYS.system)

    expect(system?.children?.map((c) => c.path)).toEqual([
      '/admin/users',
      '/admin/groups',
      '/admin/risk-control',
      '/admin/announcements',
      '/admin/settings',
      '/custom/1',
      '/custom/2',
    ])
  })

  it('does not mutate the input leaves array or its items', () => {
    const leaves = allLeaves()
    const snapshot = JSON.parse(JSON.stringify(leaves))
    Object.freeze(leaves)
    leaves.forEach((l) => Object.freeze(l))

    expect(() => groupAdminNav(leaves, buildConfigs())).not.toThrow()
    expect(JSON.parse(JSON.stringify(leaves))).toEqual(snapshot)
  })

  it('returns a brand new array (referential independence from input)', () => {
    const leaves = allLeaves()
    const result = groupAdminNav(leaves, buildConfigs())
    expect(result).not.toBe(leaves as unknown as NavItem[])
  })
})

describe('flattenAdminLeaves', () => {
  it('expands expandOnly parents into their children and keeps childless items', () => {
    const items: NavItem[] = [
      leaf('/admin/dashboard'),
      {
        path: 'group:channels',
        label: 'Channels',
        icon: 'icon',
        expandOnly: true,
        children: [leaf('/admin/channels/pricing'), leaf('/admin/channels/monitor')],
      },
      leaf('/admin/usage'),
    ]

    const flat = flattenAdminLeaves(items)
    expect(flat.map((l) => l.path)).toEqual([
      '/admin/dashboard',
      '/admin/channels/pricing',
      '/admin/channels/monitor',
      '/admin/usage',
    ])
  })

  it('does not mutate the input', () => {
    const items: NavItem[] = [leaf('/admin/dashboard')]
    Object.freeze(items)
    expect(() => flattenAdminLeaves(items)).not.toThrow()
  })
})

describe('parseStoredExpandedGroups', () => {
  it('returns null when storage is empty (no memory yet)', () => {
    expect(parseStoredExpandedGroups(null)).toBeNull()
  })

  it('parses a JSON string array of group keys', () => {
    const raw = JSON.stringify([ADMIN_NAV_GROUP_KEYS.operations, ADMIN_NAV_GROUP_KEYS.revenue])
    expect(parseStoredExpandedGroups(raw)).toEqual([
      ADMIN_NAV_GROUP_KEYS.operations,
      ADMIN_NAV_GROUP_KEYS.revenue,
    ])
  })

  it('returns an empty array when memory exists but everything was collapsed', () => {
    expect(parseStoredExpandedGroups('[]')).toEqual([])
  })

  it('returns null for malformed JSON', () => {
    expect(parseStoredExpandedGroups('{not json')).toBeNull()
  })

  it('returns null when the stored value is not an array', () => {
    expect(parseStoredExpandedGroups('"group:operations"')).toBeNull()
    expect(parseStoredExpandedGroups('123')).toBeNull()
  })

  it('drops non-string entries defensively', () => {
    expect(parseStoredExpandedGroups('["group:operations", 5, null, "group:system"]')).toEqual([
      'group:operations',
      'group:system',
    ])
  })
})

describe('serializeExpandedGroups', () => {
  it('round-trips with parseStoredExpandedGroups', () => {
    const groups = new Set([ADMIN_NAV_GROUP_KEYS.operations, ADMIN_NAV_GROUP_KEYS.system])
    const raw = serializeExpandedGroups(groups)
    expect(parseStoredExpandedGroups(raw)).toEqual([...groups])
  })
})

describe('computeDefaultExpandedGroups', () => {
  const groups = groupAdminNav(allLeaves(), buildConfigs())

  it('always expands the always-open key plus the group containing the active route', () => {
    const isActive = (path: string) => path === '/admin/accounts'
    const result = computeDefaultExpandedGroups(groups, isActive, ADMIN_NAV_GROUP_KEYS.operations)

    expect(result.has(ADMIN_NAV_GROUP_KEYS.operations)).toBe(true)
    expect(result.has(ADMIN_NAV_GROUP_KEYS.supply)).toBe(true)
    expect(result.has(ADMIN_NAV_GROUP_KEYS.revenue)).toBe(false)
    expect(result.has(ADMIN_NAV_GROUP_KEYS.system)).toBe(false)
  })

  it('expands only the always-open key when no group matches the active route', () => {
    const result = computeDefaultExpandedGroups(groups, () => false, ADMIN_NAV_GROUP_KEYS.operations)
    expect([...result]).toEqual([ADMIN_NAV_GROUP_KEYS.operations])
  })

  it('matches a deep active path against the active-route predicate', () => {
    const isActive = (path: string) => path === '/admin/orders'
    const result = computeDefaultExpandedGroups(groups, isActive, ADMIN_NAV_GROUP_KEYS.operations)
    expect(result.has(ADMIN_NAV_GROUP_KEYS.revenue)).toBe(true)
  })

  it('omits the always-open key when that group is not present', () => {
    const onlySupply = groups.filter((g) => g.path === ADMIN_NAV_GROUP_KEYS.supply)
    const result = computeDefaultExpandedGroups(onlySupply, () => false, ADMIN_NAV_GROUP_KEYS.operations)
    expect(result.has(ADMIN_NAV_GROUP_KEYS.operations)).toBe(false)
  })
})

describe('groupKeyForLeafPath', () => {
  it('returns the owning category key for each known leaf path', () => {
    expect(groupKeyForLeafPath('/admin/dashboard')).toBe(ADMIN_NAV_GROUP_KEYS.operations)
    expect(groupKeyForLeafPath('/admin/accounts')).toBe(ADMIN_NAV_GROUP_KEYS.supply)
    expect(groupKeyForLeafPath('/admin/orders')).toBe(ADMIN_NAV_GROUP_KEYS.revenue)
    expect(groupKeyForLeafPath('/admin/groups')).toBe(ADMIN_NAV_GROUP_KEYS.system)
  })

  it('returns null for a path that belongs to no category (e.g. custom menu item)', () => {
    expect(groupKeyForLeafPath('/custom/42')).toBeNull()
    expect(groupKeyForLeafPath('/admin/settings/unknown')).toBeNull()
  })

  it('stays consistent with ADMIN_NAV_GROUP_MEMBERS for every member', () => {
    for (const key of Object.keys(ADMIN_NAV_GROUP_MEMBERS) as Array<keyof typeof ADMIN_NAV_GROUP_MEMBERS>) {
      for (const path of ADMIN_NAV_GROUP_MEMBERS[key]) {
        expect(groupKeyForLeafPath(path)).toBe(key)
      }
    }
  })
})

describe('ONBOARDING_ANCHOR_PATHS', () => {
  it('maps the two sidebar tour anchors to their leaf paths', () => {
    expect(ONBOARDING_ANCHOR_PATHS['#sidebar-group-manage']).toBe('/admin/groups')
    expect(ONBOARDING_ANCHOR_PATHS['#sidebar-channel-manage']).toBe('/admin/accounts')
  })

  it('anchors point at paths that live inside collapsible groups', () => {
    expect(groupKeyForLeafPath('/admin/groups')).toBe(ADMIN_NAV_GROUP_KEYS.system)
    expect(groupKeyForLeafPath('/admin/accounts')).toBe(ADMIN_NAV_GROUP_KEYS.supply)
  })
})

describe('groupsForOnboardingAnchors', () => {
  it('resolves anchor selectors to the group keys that must be expanded', () => {
    const result = groupsForOnboardingAnchors(['#sidebar-group-manage'])
    expect([...result]).toEqual([ADMIN_NAV_GROUP_KEYS.system])
  })

  it('resolves both anchors to system + supply', () => {
    const result = groupsForOnboardingAnchors(Object.keys(ONBOARDING_ANCHOR_PATHS))
    expect(result.has(ADMIN_NAV_GROUP_KEYS.system)).toBe(true)
    expect(result.has(ADMIN_NAV_GROUP_KEYS.supply)).toBe(true)
    expect(result.size).toBe(2)
  })

  it('ignores unknown / non-anchor selectors', () => {
    const result = groupsForOnboardingAnchors(['#sidebar-group-manage', '[data-tour="sidebar-my-keys"]', '#nope'])
    expect([...result]).toEqual([ADMIN_NAV_GROUP_KEYS.system])
  })

  it('returns an empty set for no selectors', () => {
    expect(groupsForOnboardingAnchors([]).size).toBe(0)
  })

  it('returns a fresh Set each call (immutable)', () => {
    const a = groupsForOnboardingAnchors(['#sidebar-group-manage'])
    const b = groupsForOnboardingAnchors(['#sidebar-group-manage'])
    expect(a).not.toBe(b)
    expect([...a]).toEqual([...b])
  })
})
