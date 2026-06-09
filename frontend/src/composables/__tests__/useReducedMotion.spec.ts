/**
 * useReducedMotion 组合式函数单元测试
 * -----------------------------------------------------------------------------
 * 通过 mock window.matchMedia 验证返回的 ref 正确反映 prefers-reduced-motion，
 * 覆盖：匹配 / 不匹配、change 事件更新、无 matchMedia 兜底、单例共享。
 *
 * 该 composable 是模块级单例（带 initialized 标志），因此每个用例先
 * vi.resetModules() 再动态 import，拿到全新的模块实例。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type MatchMediaHandler = (event: { matches: boolean }) => void

/**
 * 安装一个可控的 window.matchMedia mock。
 * @returns 捕获到的 change 监听器列表（用于模拟系统偏好变化）。
 */
function installMatchMedia(matches: boolean): { handlers: MatchMediaHandler[] } {
  const handlers: MatchMediaHandler[] = []
  const mql = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn((_type: string, cb: MatchMediaHandler) => handlers.push(cb)),
    removeEventListener: vi.fn(),
    addListener: vi.fn((cb: MatchMediaHandler) => handlers.push(cb)),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia
  return { handlers }
}

describe('useReducedMotion', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
    vi.restoreAllMocks()
  })

  it('当 prefers-reduced-motion 匹配时，ref 为 true', async () => {
    installMatchMedia(true)
    const { useReducedMotion } = await import('../useReducedMotion')

    expect(useReducedMotion().value).toBe(true)
  })

  it('当 prefers-reduced-motion 不匹配时，ref 为 false', async () => {
    installMatchMedia(false)
    const { useReducedMotion } = await import('../useReducedMotion')

    expect(useReducedMotion().value).toBe(false)
  })

  it('系统偏好变化（change 事件）时，ref 同步更新', async () => {
    const { handlers } = installMatchMedia(false)
    const { useReducedMotion } = await import('../useReducedMotion')
    const prefersReducedMotion = useReducedMotion()

    expect(prefersReducedMotion.value).toBe(false)
    expect(handlers.length).toBeGreaterThan(0)

    // 模拟用户开启“减少动态效果”。
    handlers.forEach((handler) => handler({ matches: true }))
    expect(prefersReducedMotion.value).toBe(true)

    // 再次关闭。
    handlers.forEach((handler) => handler({ matches: false }))
    expect(prefersReducedMotion.value).toBe(false)
  })

  it('环境无 matchMedia 时，安全兜底为 false（不抛错）', async () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia
    const { useReducedMotion } = await import('../useReducedMotion')

    expect(useReducedMotion().value).toBe(false)
  })

  it('多次调用共享同一个单例 ref', async () => {
    installMatchMedia(true)
    const { useReducedMotion } = await import('../useReducedMotion')

    const first = useReducedMotion()
    const second = useReducedMotion()

    // 同一个底层 ref（值一致），且只注册一次监听器（matchMedia 只调用一次）。
    expect(first.value).toBe(second.value)
    expect(window.matchMedia).toHaveBeenCalledTimes(1)
  })

  it('返回的 ref 为只读（不可直接写）', async () => {
    installMatchMedia(false)
    const { useReducedMotion } = await import('../useReducedMotion')
    const prefersReducedMotion = useReducedMotion()

    // readonly ref：写入会被 Vue 拦截并发出警告，值保持不变。
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    ;(prefersReducedMotion as unknown as { value: boolean }).value = true
    expect(prefersReducedMotion.value).toBe(false)
    warn.mockRestore()
  })
})
