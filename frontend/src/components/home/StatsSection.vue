<!--
  StatsSection — qualitative production highlights + provider count-up
  ----------------------------------------------------------------------------
  Four glass cards stating qualitative product facts (i18n `home.stats.items.*`),
  plus ONE count-up figure. The number is NOT fabricated: it is derived from the
  code-known upstream platform families (mirrors the `Platform` union in
  @/utils/platformColors — anthropic / openai / gemini / antigravity). No uptime,
  latency, or other invented metrics appear here.

  Motion contract: cards fade up via the shared `useSectionReveal`; the count-up
  is a custom `gsap.context` tween scoped to the root. Under reduced motion the
  number snaps to its final value and cards render their static final state.
  All colors come from the `--home-*` tokens in home-immersive.css.
-->
<template>
  <section ref="root" class="home-section stats-section">
    <div class="home-container">
      <h2 class="home-h2 stats-section__title" data-reveal>{{ $t('home.stats.title') }}</h2>

      <div class="stats-section__grid">
        <!-- Featured, code-derived count-up (the only number on the page). -->
        <div class="home-glass stats-featured home-gpu" data-reveal>
          <span class="stats-featured__num">{{ count }}</span>
          <span class="stats-featured__cap">{{ $t('home.providers.title') }}</span>
        </div>

        <!-- Qualitative highlights — no numbers. -->
        <div
          v-for="item in items"
          :key="item.key"
          class="home-glass stats-card home-gpu"
          data-reveal
        >
          <h3 class="stats-card__label">{{ $t(`home.stats.items.${item.key}.label`) }}</h3>
          <p class="home-body stats-card__desc">{{ $t(`home.stats.items.${item.key}.desc`) }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { gsap, HOME_MOTION, useSectionReveal } from '@/composables/useHomeScroll'

/**
 * Upstream provider families this gateway integrates with. Kept in lockstep with
 * the code-known `Platform` union in @/utils/platformColors so the count-up
 * figure stays honest and code-derived (never a fabricated marketing number).
 */
const SUPPORTED_PROVIDERS = ['anthropic', 'openai', 'gemini', 'antigravity'] as const
const PROVIDER_COUNT = SUPPORTED_PROVIDERS.length

/** Qualitative highlight cards — keys map into i18n `home.stats.items.*`. */
const items = [
  { key: 'unifiedEntry' },
  { key: 'smartScheduling' },
  { key: 'tokenBilling' },
  { key: 'autoFailover' },
] as const

const root = ref<HTMLElement | null>(null)
const count = ref(0)

const { prefersReducedMotion } = useSectionReveal(root)

let ctx: gsap.Context | null = null

onMounted(() => {
  if (!root.value) return

  ctx = gsap.context(() => {
    // Reduced motion → show the final value immediately, no trigger.
    if (prefersReducedMotion.value) {
      count.value = PROVIDER_COUNT
      return
    }

    const proxy = { value: 0 }
    gsap.to(proxy, {
      value: PROVIDER_COUNT,
      duration: HOME_MOTION.duration * 1.5,
      ease: HOME_MOTION.ease,
      snap: { value: 1 },
      onUpdate: () => {
        count.value = Math.round(proxy.value)
      },
      scrollTrigger: {
        trigger: root.value,
        start: HOME_MOTION.revealStart,
        toggleActions: 'play none none none',
      },
    })
  }, root.value)
})

onUnmounted(() => {
  ctx?.revert()
  ctx = null
})
</script>

<style scoped>
.stats-section__title {
  max-width: 44rem;
  margin-bottom: clamp(2rem, 5vw, 3.25rem);
}

.stats-section__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(1rem, 2.5vw, 1.5rem);
}

@media (min-width: 640px) {
  .stats-section__grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .stats-section__grid {
    /* Featured count spans full height of the left column; 4 cards on the right. */
    grid-template-columns: repeat(3, 1fr);
  }

  .stats-featured {
    grid-row: span 2;
  }
}

/* --- Featured count-up ---------------------------------------------------- */
.stats-featured {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.5rem;
  padding: clamp(1.75rem, 3.5vw, 2.5rem);
  background-image: radial-gradient(
    120% 100% at 0% 0%,
    var(--home-primary-glow) 0%,
    transparent 60%
  );
}

.stats-featured__num {
  font-size: clamp(3.5rem, 9vw, 6rem);
  font-weight: var(--home-title-weight);
  letter-spacing: var(--home-title-tracking);
  line-height: 1;
  color: var(--home-text);
  font-variant-numeric: tabular-nums;
}

.stats-featured__cap {
  font-size: var(--home-body);
  font-weight: 600;
  color: var(--home-primary);
}

/* --- Qualitative cards ---------------------------------------------------- */
.stats-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding: clamp(1.4rem, 3vw, 2rem);
  transition: border-color 0.3s ease, background-color 0.3s ease, transform 0.3s ease;
}

.stats-card:hover {
  border-color: var(--home-primary);
  background-color: var(--home-surface-2);
  transform: translateY(-2px);
}

.stats-card__label {
  font-size: clamp(1.05rem, 1.6vw, 1.3rem);
  font-weight: 700;
  letter-spacing: var(--home-title-tracking);
  color: var(--home-text);
}

.stats-card__desc {
  font-size: clamp(0.9rem, 1.2vw, 1.02rem);
}
</style>
