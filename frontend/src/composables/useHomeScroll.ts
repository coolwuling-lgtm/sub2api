/**
 * useHomeScroll — Immersive homepage scroll orchestration (GSAP + Lenis)
 * =============================================================================
 * Central scroll-animation infrastructure for the immersive HomeView. This
 * module is the single source of truth for:
 *   - GSAP `ScrollTrigger` registration (done once, at module load)
 *   - Lenis smooth-scroll lifecycle, wired to the GSAP ticker
 *   - Global `prefers-reduced-motion` gating + static final-state fallback
 *   - A shared `useSectionReveal()` helper every section reuses
 *   - Shared motion tokens (`HOME_MOTION`) for consistent timing/easing
 *
 * -----------------------------------------------------------------------------
 * SECTION INTEGRATION CONTRACT  (read this before building a section)
 * -----------------------------------------------------------------------------
 * 1. ROOT REF + CLASS
 *    Every section's root element MUST own a template ref and the shared
 *    `home-section` layout class (plus its own modifier class), e.g.:
 *
 *      <section ref="root" class="home-section hero-section"> ... </section>
 *      const root = ref<HTMLElement | null>(null)
 *
 * 2. DECLARATIVE REVEAL (the common case — no custom JS needed)
 *    Mark elements that should fade-up into view with `data-reveal`, then call
 *    `useSectionReveal(root)` in <script setup>. It handles onMounted/onUnmounted,
 *    reduce-motion, and a single staggered fade-up driven by ONE ScrollTrigger
 *    on the section root (plays once, never reverses):
 *
 *      import { useSectionReveal } from '@/composables/useHomeScroll'
 *      const root = ref<HTMLElement | null>(null)
 *      useSectionReveal(root)
 *
 *      <h2 data-reveal>Title</h2>
 *      <p  data-reveal>Subtitle</p>   <!-- staggered after the title -->
 *
 * 3. DECORATIVE PARALLAX (Y-axis only — NEVER parallax body text)
 *    Mark purely decorative elements with `data-parallax`; optionally set the
 *    travel amount as a yPercent number via the attribute value
 *    (`data-parallax="20"`, default 15). `useSectionReveal(root)` wires these
 *    automatically. Skipped entirely under reduce-motion.
 *
 *      <div class="glow" data-parallax="25" aria-hidden="true"></div>
 *
 * 4. CUSTOM TIMELINES (Hero intro, RequestFlow pin/scrub, OneLine scrub,
 *    Terminal typing, etc.)
 *    Import everything you need from THIS module so you share the registered
 *    ScrollTrigger instance and the reduce-motion flag, and build your own
 *    `gsap.context(() => { ... }, root.value)` scoped to your root:
 *
 *      import { gsap, ScrollTrigger, useReducedMotion, HOME_MOTION }
 *        from '@/composables/useHomeScroll'
 *
 *      const prefersReducedMotion = useReducedMotion()
 *      let ctx: gsap.Context | null = null
 *      onMounted(() => {
 *        if (!root.value) return
 *        ctx = gsap.context(() => {
 *          if (prefersReducedMotion.value) {
 *            // SET THE STATIC FINAL STATE — no ScrollTrigger, no scrub, no pin.
 *            gsap.set('[data-reveal]', { opacity: 1, y: 0 })
 *            return
 *          }
 *          // ...timelines / ScrollTrigger pin / scrub here...
 *        }, root.value)
 *      })
 *      onUnmounted(() => { ctx?.revert(); ctx = null })
 *
 *    RULES:
 *      • Always scope to your own root via `gsap.context(fn, root.value)` and
 *        `revert()` on unmount — never leak triggers across sections.
 *      • Always branch on `prefersReducedMotion.value` and provide a static
 *        final state. The whole page must be fully usable with motion off.
 *      • There is AT MOST ONE pin on the whole page (RequestFlowSection).
 *      • Only the Y axis, and only decorative elements, may parallax.
 *      • Use the `HOME_MOTION` tokens below for timing/easing consistency.
 *      • Do NOT init Lenis or re-register ScrollTrigger — HomeView's single
 *        `useHomeScroll()` call owns the global scroll lifecycle; importing
 *        from this module already registers ScrollTrigger.
 */
import { onMounted, onUnmounted, type Ref } from 'vue'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { useReducedMotion } from './useReducedMotion'

// Register the plugin exactly once, at module load. Because every section
// imports from this module, ScrollTrigger is guaranteed registered before any
// section builds a trigger — independent of component mount order.
gsap.registerPlugin(ScrollTrigger)

// Re-export the shared, registered instances + the reduce-motion flag so a
// section can rely on a single import surface.
export { gsap, ScrollTrigger, useReducedMotion }

/**
 * Shared motion design tokens. Keep section animations within these ranges so
 * the page reads as one coherent piece of choreography.
 */
export const HOME_MOTION = {
  /** Enter/transition duration (seconds). Spec range: 0.7–0.9. */
  duration: 0.8,
  /** Standard easing for entrances. */
  ease: 'power3.out',
  /** Stagger between grouped reveal targets (seconds). Spec range: 0.08–0.12. */
  stagger: 0.1,
  /** Fade-up travel distance for reveals (px). */
  revealY: 24,
  /** ScrollTrigger `start` for reveals. */
  revealStart: 'top 82%',
  /** Default decorative parallax travel (yPercent of element height). */
  parallaxPercent: 15,
} as const

/** Options for {@link useSectionReveal}. */
export interface SectionRevealOptions {
  /** CSS selector for reveal targets within the root. Default `[data-reveal]`. */
  revealSelector?: string
  /** CSS selector for parallax targets within the root. Default `[data-parallax]`. */
  parallaxSelector?: string
  /** Fade-up travel distance in px. Default {@link HOME_MOTION.revealY}. */
  y?: number
  /** Per-target stagger in seconds. Default {@link HOME_MOTION.stagger}. */
  stagger?: number
  /** Reveal duration in seconds. Default {@link HOME_MOTION.duration}. */
  duration?: number
  /** ScrollTrigger `start`. Default {@link HOME_MOTION.revealStart}. */
  start?: string
}

/** Lenis smooth-scroll tuning for the immersive homepage. */
const LENIS_OPTIONS = {
  // Linear-interpolation factor; lower = smoother/heavier. Lenis default 0.1.
  lerp: 0.1,
  smoothWheel: true,
} as const

/**
 * Wire up the shared per-section choreography for `[data-reveal]` (staggered
 * fade-up, plays once) and `[data-parallax]` (decorative Y-axis parallax).
 *
 * Self-contained: registers its own `onMounted`/`onUnmounted`, owns a
 * `gsap.context` scoped to `rootRef`, and reverts it on unmount. Under
 * reduce-motion it sets the static final state and creates no ScrollTriggers.
 *
 * @param rootRef Template ref to the section's root element.
 * @param options Optional overrides for selectors/timing.
 * @returns The shared `prefersReducedMotion` flag for further branching.
 */
export function useSectionReveal(
  rootRef: Ref<HTMLElement | null>,
  options: SectionRevealOptions = {},
): { prefersReducedMotion: Readonly<Ref<boolean>> } {
  const prefersReducedMotion = useReducedMotion()
  let ctx: gsap.Context | null = null

  const revealSelector = options.revealSelector ?? '[data-reveal]'
  const parallaxSelector = options.parallaxSelector ?? '[data-parallax]'

  onMounted(() => {
    const root = rootRef.value
    if (!root) return

    const revealTargets = root.querySelectorAll<HTMLElement>(revealSelector)
    const parallaxTargets = root.querySelectorAll<HTMLElement>(parallaxSelector)

    ctx = gsap.context(() => {
      // Reduced motion → static final state, no ScrollTriggers at all.
      if (prefersReducedMotion.value) {
        if (revealTargets.length) {
          gsap.set(revealTargets, { opacity: 1, y: 0, clearProps: 'transform' })
        }
        return
      }

      // Staggered fade-up: one ScrollTrigger on the root, plays once.
      if (revealTargets.length) {
        gsap.from(revealTargets, {
          opacity: 0,
          y: options.y ?? HOME_MOTION.revealY,
          duration: options.duration ?? HOME_MOTION.duration,
          ease: HOME_MOTION.ease,
          stagger: options.stagger ?? HOME_MOTION.stagger,
          scrollTrigger: {
            trigger: root,
            start: options.start ?? HOME_MOTION.revealStart,
            toggleActions: 'play none none none',
          },
        })
      }

      // Decorative Y-axis parallax (scrub-linked to scroll progress).
      parallaxTargets.forEach((el) => {
        const raw = Number.parseFloat(el.dataset.parallax ?? '')
        const yPercent = Number.isFinite(raw) ? raw : HOME_MOTION.parallaxPercent
        gsap.to(el, {
          yPercent,
          ease: 'none',
          scrollTrigger: {
            trigger: root,
            start: 'top bottom',
            end: 'bottom top',
            scrub: true,
          },
        })
      })
    }, root)
  })

  onUnmounted(() => {
    ctx?.revert()
    ctx = null
  })

  return { prefersReducedMotion }
}

/**
 * Global scroll lifecycle for the immersive homepage. Call ONCE from HomeView.
 *
 * - Under reduce-motion: does NOT start Lenis. Sections render their static
 *   final state; native scrolling is used. A `ScrollTrigger.refresh()` keeps
 *   any (non-section) measurements consistent.
 * - Otherwise: starts Lenis, feeds it from the GSAP ticker (`lagSmoothing(0)`),
 *   and updates ScrollTrigger on every Lenis scroll event.
 *
 * On unmount it tears everything down: removes the ticker callback, destroys
 * Lenis, and kills all ScrollTriggers (sections also revert their own contexts
 * on their unmount, which fires first).
 *
 * @returns The shared `prefersReducedMotion` flag.
 */
export function useHomeScroll(): {
  prefersReducedMotion: Readonly<Ref<boolean>>
} {
  const prefersReducedMotion = useReducedMotion()
  let lenis: Lenis | null = null
  let tickerCallback: ((time: number) => void) | null = null

  onMounted(() => {
    if (prefersReducedMotion.value) {
      // Motion off: no smooth scroll. Let layout settle, then sync triggers.
      ScrollTrigger.refresh()
      return
    }

    lenis = new Lenis(LENIS_OPTIONS)

    // Keep ScrollTrigger in sync with Lenis' virtual scroll position.
    lenis.on('scroll', ScrollTrigger.update)

    // Drive Lenis from GSAP's ticker (single rAF loop for the whole page).
    tickerCallback = (time: number) => {
      // GSAP ticker time is in seconds; Lenis expects milliseconds.
      lenis?.raf(time * 1000)
    }
    gsap.ticker.add(tickerCallback)
    gsap.ticker.lagSmoothing(0)

    // Sections mount before HomeView, so positions are now final — refresh.
    ScrollTrigger.refresh()
  })

  onUnmounted(() => {
    if (tickerCallback) {
      gsap.ticker.remove(tickerCallback)
      tickerCallback = null
    }
    lenis?.destroy()
    lenis = null
    // Defensive global cleanup; section contexts have already reverted.
    ScrollTrigger.getAll().forEach((trigger) => trigger.kill())
  })

  return { prefersReducedMotion }
}
