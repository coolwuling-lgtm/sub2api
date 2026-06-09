/**
 * useHomeScroll / useSectionReveal 组合式函数单元测试
 * -----------------------------------------------------------------------------
 * vi.mock 掉 gsap / gsap/ScrollTrigger / lenis，用 @vue/test-utils 挂载最小测试
 * 组件来触发 onMounted / onUnmounted，覆盖：
 *  - useSectionReveal：reduce-motion=true 走静态最终态（gsap.set 被调、不建 reveal/
 *    parallax 动画）；reduce-motion=false 为 [data-reveal] 建交错 reveal、为
 *    [data-parallax] 建视差；卸载时 ctx.revert()。
 *  - useHomeScroll：reduce-motion=true 不 new Lenis（仅 ScrollTrigger.refresh）；
 *    false 时 new Lenis + lenis.on('scroll', ScrollTrigger.update) + ticker.add +
 *    lagSmoothing(0)；卸载时 ticker.remove + lenis.destroy + ScrollTrigger kill。
 *
 * reduce-motion 由真实的 useReducedMotion 单例驱动 → 通过 window.matchMedia mock +
 * vi.resetModules() + 动态 import 控制每个用例的偏好取值。
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { defineComponent, ref, h, type Ref } from 'vue'
import { mount } from '@vue/test-utils'

// --- 共享 mock（vi.hoisted 以便 vi.mock 工厂引用） ---------------------------
const m = vi.hoisted(() => {
  const revert = vi.fn()
  return {
    revert,
    gsap: {
      registerPlugin: vi.fn(),
      set: vi.fn(),
      from: vi.fn(),
      to: vi.fn(),
      // context 立即执行回调（让内部 reveal/parallax 逻辑跑起来），返回带 revert 的句柄。
      context: vi.fn((fn: () => void) => {
        fn()
        return { revert }
      }),
      ticker: {
        add: vi.fn(),
        remove: vi.fn(),
        lagSmoothing: vi.fn()
      }
    },
    scrollTrigger: {
      update: vi.fn(),
      refresh: vi.fn(),
      getAll: vi.fn(() => [] as Array<{ kill: () => void }>)
    },
    lenisInstance: {
      on: vi.fn(),
      raf: vi.fn(),
      destroy: vi.fn()
    },
    lenisCtor: vi.fn()
  }
})

vi.mock('gsap', () => ({ gsap: m.gsap }))
vi.mock('gsap/ScrollTrigger', () => ({ ScrollTrigger: m.scrollTrigger }))
vi.mock('lenis', () => ({
  default: m.lenisCtor.mockImplementation(() => m.lenisInstance)
}))

// --- helpers -----------------------------------------------------------------
function installMatchMedia(matches: boolean): void {
  const mql = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn()
  }
  window.matchMedia = vi.fn().mockReturnValue(mql) as unknown as typeof window.matchMedia
}

/** 重新加载被测模块（在设置好 matchMedia 之后），保证 reduce-motion 取新值。 */
async function loadModule() {
  return await import('../useHomeScroll')
}

const originalMatchMedia = window.matchMedia

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  // clearAllMocks 会清掉 lenisCtor 的实现，重新挂回。
  m.lenisCtor.mockImplementation(() => m.lenisInstance)
})

afterEach(() => {
  window.matchMedia = originalMatchMedia
})

// =============================================================================
describe('useSectionReveal', () => {
  /** 挂载一个含 [data-reveal] 与 [data-parallax] 的最小组件。 */
  async function mountSection() {
    const { useSectionReveal } = await loadModule()
    const Comp = defineComponent({
      setup() {
        const root: Ref<HTMLElement | null> = ref(null)
        useSectionReveal(root)
        return () =>
          h('section', { ref: root }, [
            h('h2', { 'data-reveal': '' }, 'title'),
            h('p', { 'data-reveal': '' }, 'subtitle'),
            h('div', { 'data-parallax': '20', 'aria-hidden': 'true' })
          ])
      }
    })
    return mount(Comp)
  }

  it('reduce-motion=false：为 [data-reveal] 建交错 reveal、为 [data-parallax] 建视差', async () => {
    installMatchMedia(false)
    const wrapper = await mountSection()

    // 一次 gsap.from（一组 reveal 目标，交错），且带 scrollTrigger 配置。
    expect(m.gsap.from).toHaveBeenCalledTimes(1)
    const fromArgs = m.gsap.from.mock.calls[0][1] as Record<string, unknown>
    expect(fromArgs.opacity).toBe(0)
    expect(fromArgs).toHaveProperty('stagger')
    expect(fromArgs).toHaveProperty('scrollTrigger')
    expect((fromArgs.scrollTrigger as Record<string, unknown>).start).toBe('top 82%')
    expect((fromArgs.scrollTrigger as Record<string, unknown>).toggleActions).toBe(
      'play none none none'
    )

    // 一个 [data-parallax] 元素 → 一次 gsap.to（仅 Y 轴 yPercent、scrub、ease none）。
    expect(m.gsap.to).toHaveBeenCalledTimes(1)
    const toArgs = m.gsap.to.mock.calls[0][1] as Record<string, unknown>
    expect(toArgs.yPercent).toBe(20)
    expect(toArgs.ease).toBe('none')
    expect((toArgs.scrollTrigger as Record<string, unknown>).scrub).toBe(true)

    // 非 reduce-motion 不应直接 set 最终态。
    expect(m.gsap.set).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('reduce-motion=true：走静态最终态（gsap.set 被调用，不建 reveal/parallax 动画）', async () => {
    installMatchMedia(true)
    const wrapper = await mountSection()

    expect(m.gsap.set).toHaveBeenCalledTimes(1)
    const setArgs = m.gsap.set.mock.calls[0][1] as Record<string, unknown>
    expect(setArgs.opacity).toBe(1)
    expect(setArgs.y).toBe(0)

    // 静态最终态：不创建 reveal/parallax（即不建 ScrollTrigger）。
    expect(m.gsap.from).not.toHaveBeenCalled()
    expect(m.gsap.to).not.toHaveBeenCalled()

    wrapper.unmount()
  })

  it('始终通过 gsap.context 管理，卸载时 ctx.revert()', async () => {
    installMatchMedia(false)
    const wrapper = await mountSection()

    expect(m.gsap.context).toHaveBeenCalledTimes(1)
    expect(m.revert).not.toHaveBeenCalled()

    wrapper.unmount()
    expect(m.revert).toHaveBeenCalledTimes(1)
  })
})

// =============================================================================
describe('useHomeScroll', () => {
  async function mountHost() {
    const { useHomeScroll } = await loadModule()
    const Comp = defineComponent({
      setup() {
        useHomeScroll()
        return () => h('div')
      }
    })
    return mount(Comp)
  }

  it('reduce-motion=false：初始化 Lenis + ticker 喂帧 + ScrollTrigger.update/refresh', async () => {
    installMatchMedia(false)
    const wrapper = await mountHost()

    expect(m.lenisCtor).toHaveBeenCalledTimes(1)
    // Lenis 滚动事件喂给 ScrollTrigger.update。
    expect(m.lenisInstance.on).toHaveBeenCalledWith('scroll', m.scrollTrigger.update)
    // 用 gsap.ticker 驱动 + 关闭 lagSmoothing。
    expect(m.gsap.ticker.add).toHaveBeenCalledTimes(1)
    expect(m.gsap.ticker.lagSmoothing).toHaveBeenCalledWith(0)
    expect(m.scrollTrigger.refresh).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('reduce-motion=true：不启用 Lenis（仅 ScrollTrigger.refresh）', async () => {
    installMatchMedia(true)
    const wrapper = await mountHost()

    expect(m.lenisCtor).not.toHaveBeenCalled()
    expect(m.gsap.ticker.add).not.toHaveBeenCalled()
    expect(m.gsap.ticker.lagSmoothing).not.toHaveBeenCalled()
    expect(m.scrollTrigger.refresh).toHaveBeenCalledTimes(1)

    wrapper.unmount()
  })

  it('卸载时清理：ticker.remove + lenis.destroy + 杀掉所有 ScrollTrigger', async () => {
    installMatchMedia(false)
    const kill = vi.fn()
    m.scrollTrigger.getAll.mockReturnValue([{ kill }])

    const wrapper = await mountHost()
    wrapper.unmount()

    expect(m.gsap.ticker.remove).toHaveBeenCalledTimes(1)
    expect(m.lenisInstance.destroy).toHaveBeenCalledTimes(1)
    expect(m.scrollTrigger.getAll).toHaveBeenCalled()
    expect(kill).toHaveBeenCalledTimes(1)
  })

  it('reduce-motion=true 卸载时不触碰 Lenis/ticker（但仍做防御性 ScrollTrigger 清理）', async () => {
    installMatchMedia(true)
    const wrapper = await mountHost()
    wrapper.unmount()

    expect(m.gsap.ticker.remove).not.toHaveBeenCalled()
    expect(m.lenisInstance.destroy).not.toHaveBeenCalled()
    expect(m.scrollTrigger.getAll).toHaveBeenCalled()
  })

  it('模块加载即注册 ScrollTrigger 插件', async () => {
    installMatchMedia(false)
    await loadModule()
    expect(m.gsap.registerPlugin).toHaveBeenCalledWith(m.scrollTrigger)
  })
})
