<!--
  RequestFlowSection — the page's single pinned + scrub narrative (CORE)
  ----------------------------------------------------------------------------
  Visualises how one request is handled end-to-end:
    client → gateway → account-select → upstream model → billing.

  ANIMATED (desktop, motion on):
    The section is the ONLY pinned element on the page. A single GSAP timeline,
    driven by one scrubbed ScrollTrigger (pin: true, start 'top top', end derived
    from the step count), progressively lights up each pipeline node, flows light
    along each connector, and crossfades the readout to the current step's copy.

  DEGRADED (prefers-reduced-motion OR narrow/mobile, snapshot once at mount):
    No pin, no scrub, no ScrollTrigger. The pipeline diagram is hidden and the
    readout becomes a static, fully-readable vertical stack of every step — all
    nodes in their final state. Layout is driven purely by CSS via the
    `request-flow--degraded` modifier; the script only sets the final values.

  Owns its own `gsap.context` scoped to the section root and reverts it on
  unmount. All colors come from the `--home-*` tokens (never hardcoded).
  Contract: see the file header of @/composables/useHomeScroll.
-->
<template>
  <section
    ref="root"
    class="home-section request-flow"
    :class="{ 'request-flow--degraded': degraded }"
  >
    <div class="home-container rf">
      <header class="rf__head">
        <h2 class="home-h2" data-reveal>{{ t('home.requestFlow.title') }}</h2>
        <p class="home-body rf__subtitle" data-reveal>{{ t('home.requestFlow.subtitle') }}</p>
      </header>

      <!--
        Visual pipeline — decorative. The readout below carries the accessible
        copy (label + description), so the pipeline is hidden from the a11y tree
        to avoid double-reading the short labels.
      -->
      <div class="rf__pipeline" aria-hidden="true">
        <template v-for="(step, i) in steps" :key="step.key">
          <div class="rf__node">
            <span class="rf__marker">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
                <path :d="step.icon" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <span class="rf__node-label">{{ t(`home.requestFlow.steps.${step.key}.label`) }}</span>
          </div>
          <span v-if="i < steps.length - 1" class="rf__connector">
            <span class="rf__connector-fill"></span>
          </span>
        </template>
      </div>

      <!-- Step readout: crossfades while pinned; full static stack when degraded. -->
      <ol class="rf__readout">
        <li v-for="(step, i) in steps" :key="step.key" class="rf__desc">
          <p class="rf__desc-head">
            <span class="rf__desc-num">{{ String(i + 1).padStart(2, '0') }}</span>
            <span>{{ t(`home.requestFlow.steps.${step.key}.label`) }}</span>
          </p>
          <p class="rf__desc-text home-body">{{ t(`home.requestFlow.steps.${step.key}.desc`) }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { gsap, useReducedMotion, HOME_MOTION } from '@/composables/useHomeScroll'

/** Ordered keys must match `home.requestFlow.steps.*` in the locale files. */
type StepKey = 'client' | 'gateway' | 'select' | 'upstream' | 'billing'

interface FlowStep {
  /** i18n key under `home.requestFlow.steps`. */
  readonly key: StepKey
  /** Single-path SVG `d` (Heroicons outline) rendered inside a 24×24 viewBox. */
  readonly icon: string
}

const { t } = useI18n()

// Heroicons v2 (outline) single-path glyphs — bound via `:d` so no v-html.
const steps: readonly FlowStep[] = [
  {
    key: 'client',
    icon: 'M9 17.25v1.007a3 3 0 0 1-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0 1 15 18.257V17.25m6-12V15a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 15V5.25m18 0A2.25 2.25 0 0 0 18.75 3H5.25A2.25 2.25 0 0 0 3 5.25m18 0V12a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 12V5.25',
  },
  {
    key: 'gateway',
    icon: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z',
  },
  {
    key: 'select',
    icon: 'M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5',
  },
  {
    key: 'upstream',
    icon: 'M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z',
  },
  {
    key: 'billing',
    icon: 'M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z',
  },
]

const root = ref<HTMLElement | null>(null)
const prefersReducedMotion = useReducedMotion()

/** Below this width the pinned scrub is too cramped — fall back to the stack. */
const NARROW_QUERY = '(max-width: 900px)'

function detectNarrow(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(NARROW_QUERY).matches
}

// Snapshot once at setup so the layout class (`request-flow--degraded`) and the
// animation branch always agree and never drift mid-session — mirroring the
// read-once-at-mount model the rest of the homepage uses.
const degraded = ref(prefersReducedMotion.value || detectNarrow())

/** Pinned scroll distance contributed by each step (px). */
const PIN_DISTANCE_PER_STEP = 340

let ctx: gsap.Context | null = null

onMounted(() => {
  const el = root.value
  if (!el) return

  ctx = gsap.context(() => {
    const headerTargets = el.querySelectorAll<HTMLElement>('[data-reveal]')
    const nodes = gsap.utils.toArray<HTMLElement>(el.querySelectorAll('.rf__node'))
    const fills = gsap.utils.toArray<HTMLElement>(el.querySelectorAll('.rf__connector-fill'))
    const descs = gsap.utils.toArray<HTMLElement>(el.querySelectorAll('.rf__desc'))

    // DEGRADED: static final state, no ScrollTrigger / pin / scrub.
    if (degraded.value) {
      gsap.set(headerTargets, { opacity: 1, y: 0 })
      gsap.set(nodes, { '--rf-on': 1 })
      gsap.set(fills, { '--rf-fill': 1 })
      gsap.set(descs, { opacity: 1, y: 0 })
      return
    }

    // Header reveal — plays once as the section scrolls into view (pre-pin).
    if (headerTargets.length) {
      gsap.from(headerTargets, {
        opacity: 0,
        y: HOME_MOTION.revealY,
        duration: HOME_MOTION.duration,
        ease: HOME_MOTION.ease,
        stagger: HOME_MOTION.stagger,
        scrollTrigger: {
          trigger: el,
          start: HOME_MOTION.revealStart,
          toggleActions: 'play none none none',
        },
      })
    }

    // Initial pipeline state: only the first node + first readout are "on".
    gsap.set(nodes, { '--rf-on': 0 })
    if (nodes[0]) gsap.set(nodes[0], { '--rf-on': 1 })
    gsap.set(fills, { '--rf-fill': 0 })
    gsap.set(descs, { opacity: 0, y: 14 })
    if (descs[0]) gsap.set(descs[0], { opacity: 1, y: 0 })

    const stepCount = nodes.length
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: el,
        start: 'top top',
        end: `+=${stepCount * PIN_DISTANCE_PER_STEP}`,
        pin: true,
        pinSpacing: true,
        scrub: 0.6,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      },
    })

    // One segment per connector: hand the request from step i to step i + 1.
    const SEG = 1
    for (let i = 0; i < fills.length; i++) {
      const at = i * SEG
      // Crossfade the current readout out…
      tl.to(descs[i], { opacity: 0, y: -14, duration: SEG * 0.35, ease: 'power1.in' }, at)
      // …flow light along the connector…
      tl.to(fills[i], { '--rf-fill': 1, duration: SEG * 0.8, ease: 'power1.inOut' }, at)
      // …ignite the next node as the light arrives…
      const next = nodes[i + 1]
      if (next) tl.to(next, { '--rf-on': 1, duration: SEG * 0.4, ease: 'power2.out' }, at + SEG * 0.55)
      // …and bring the next readout in.
      const nextDesc = descs[i + 1]
      if (nextDesc) tl.to(nextDesc, { opacity: 1, y: 0, duration: SEG * 0.45, ease: 'power2.out' }, at + SEG * 0.6)
    }
    // Tail hold so the final step lingers at the end of the pin.
    tl.to({}, { duration: SEG * 0.4 })
  }, el)
})

onUnmounted(() => {
  ctx?.revert()
  ctx = null
})
</script>

<style scoped>
/* Animated default: fill the viewport so the pin reads as a held, centered scene. */
.request-flow {
  box-sizing: border-box;
  display: flex;
  align-items: center;
  min-height: 100vh;
  padding-block: clamp(3rem, 8vh, 6rem);
}

.rf {
  width: 100%;
}

.rf__head {
  max-width: 46rem;
  margin-inline: auto;
  margin-bottom: clamp(2.5rem, 6vh, 4.5rem);
  text-align: center;
}

.rf__subtitle {
  margin-top: 1rem;
}

/* ---- Pipeline (horizontal flow diagram) --------------------------------- */
.rf__pipeline {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  max-width: 60rem;
  margin-inline: auto;
  margin-bottom: clamp(2rem, 5vh, 3.5rem);
}

.rf__node {
  --rf-on: 0;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  width: clamp(5rem, 9vw, 7rem);
  text-align: center;
  /* Inactive nodes are dimmed but the label stays readable. */
  opacity: calc(0.4 + 0.6 * var(--rf-on, 0));
}

.rf__marker {
  position: relative;
  display: grid;
  place-items: center;
  width: clamp(3.25rem, 4.5vw, 4rem);
  height: clamp(3.25rem, 4.5vw, 4rem);
  border: 1px solid var(--home-border);
  border-radius: 50%;
  background: var(--home-surface);
  color: var(--home-text);
  transform: scale(calc(0.94 + 0.06 * var(--rf-on, 0)));
}

/* Glow ring that ignites with the node (driven by --rf-on). */
.rf__marker::after {
  content: '';
  position: absolute;
  inset: -3px;
  border: 1px solid var(--home-primary);
  border-radius: inherit;
  box-shadow:
    0 0 22px var(--home-primary-glow),
    inset 0 0 12px var(--home-primary-glow);
  opacity: var(--rf-on, 0);
  pointer-events: none;
}

.rf__marker svg {
  width: 46%;
  height: 46%;
}

.rf__node-label {
  font-size: 0.8rem;
  font-weight: 600;
  line-height: 1.2;
  letter-spacing: -0.01em;
  color: var(--home-text);
}

/* Connector track between two nodes — vertically centered against the markers. */
.rf__connector {
  position: relative;
  flex: 1 1 auto;
  min-width: 1.5rem;
  height: 2px;
  margin-top: calc(clamp(3.25rem, 4.5vw, 4rem) / 2 - 1px);
  border-radius: 999px;
  background: var(--home-border);
}

/* Bright fill that flows left→right as the request advances (driven by --rf-fill). */
.rf__connector-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--home-primary), var(--home-accent));
  box-shadow: 0 0 10px var(--home-primary-glow);
  transform: scaleX(var(--rf-fill, 0));
  transform-origin: left center;
}

/* Leading "flow light" cap at the head of the fill. */
.rf__connector-fill::after {
  content: '';
  position: absolute;
  top: 50%;
  right: -3px;
  width: 7px;
  height: 7px;
  transform: translateY(-50%);
  border-radius: 50%;
  background: var(--home-accent);
  box-shadow:
    0 0 12px var(--home-accent),
    0 0 20px var(--home-primary-glow);
  opacity: var(--rf-fill, 0);
}

/* ---- Readout (current step copy; crossfaded while pinned) --------------- */
.rf__readout {
  position: relative;
  max-width: 40rem;
  min-height: clamp(6rem, 14vh, 8rem);
  margin-inline: auto;
  padding: 0;
  list-style: none;
  text-align: center;
}

.rf__desc {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  margin: 0;
  /* All descriptions stay in the a11y tree; opacity (not visibility) drives the
     crossfade so screen readers can read every step in order. */
  opacity: 0;
  pointer-events: none;
}

.rf__desc-head {
  display: inline-flex;
  align-items: baseline;
  gap: 0.6rem;
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--home-text);
}

.rf__desc-num {
  font-size: 0.85rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--home-primary);
}

.rf__desc-text {
  margin: 0;
}

/* ---- Degraded: reduced-motion / narrow → static vertical stack ---------- */
.request-flow--degraded {
  display: block;
  min-height: auto;
  padding-block: var(--home-section-py);
}

.request-flow--degraded .rf__pipeline {
  display: none;
}

.request-flow--degraded .rf__readout {
  position: static;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 36rem;
  min-height: 0;
  text-align: left;
}

.request-flow--degraded .rf__desc {
  position: static;
  inset: auto;
  align-items: flex-start;
  padding: 1.1rem 1.25rem;
  border: 1px solid var(--home-border);
  border-radius: var(--home-radius-sm);
  background: var(--home-surface);
  /* Final, fully-readable state for every step. */
  opacity: 1;
  text-align: left;
}

.request-flow--degraded .rf__desc-head {
  font-size: 1.05rem;
}
</style>
