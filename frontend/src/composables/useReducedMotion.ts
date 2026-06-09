/**
 * useReducedMotion
 * -----------------------------------------------------------------------------
 * Shared, app-wide tracker for the `prefers-reduced-motion: reduce` media query.
 *
 * Returns a read-only reactive boolean. When `true`, motion-heavy code paths
 * (GSAP scroll animations, Lenis smooth scrolling, marquees, pinned scrubs)
 * MUST be skipped in favour of their static final state.
 *
 * A single module-level ref + one passive media-query listener are shared by
 * every caller, so the flag is always consistent across the homepage sections.
 * The listener is intentionally never torn down — it is a lightweight, passive
 * subscription that lives for the app lifetime.
 *
 * Usage:
 *   const prefersReducedMotion = useReducedMotion()
 *   if (prefersReducedMotion.value) { ...set final state... }
 */
import { ref, readonly, type Ref } from 'vue'

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)'

// Module-singleton: one source of truth shared by all consumers.
const prefersReducedMotion = ref(false)
let initialized = false

function ensureInitialized(): void {
  if (initialized) return
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    // SSR / non-DOM environment: leave the default (motion enabled).
    return
  }

  initialized = true

  const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY)
  prefersReducedMotion.value = mediaQuery.matches

  const handleChange = (event: MediaQueryListEvent): void => {
    prefersReducedMotion.value = event.matches
  }

  // `addEventListener` is the modern API; fall back to the deprecated
  // `addListener` for older Safari.
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', handleChange)
  } else if (typeof mediaQuery.addListener === 'function') {
    mediaQuery.addListener(handleChange)
  }
}

/**
 * Returns a read-only reactive boolean tracking the user's reduced-motion
 * preference. Read `.value` at animation-setup time.
 */
export function useReducedMotion(): Readonly<Ref<boolean>> {
  ensureInitialized()
  return readonly(prefersReducedMotion)
}
