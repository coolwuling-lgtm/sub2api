<!--
  HeroSection — immersive homepage hero
  ----------------------------------------------------------------------------
  Giant fluid headline (site name) + gradient value-prop emphasis (site
  subtitle) + supporting copy + dual CTA + a "Unified AI Gateway" badge, with
  the GSAP typewriter <TerminalDemo/> embedded as the visual anchor.

  Copy is data-driven and reuses existing settings/i18n:
    • site name / subtitle come from useAppStore.cachedPublicSettings (with
      sensible i18n fallbacks), exactly like the rest of the app.
    • the primary CTA target switches on auth state (dashboard vs. /login),
      mirroring the legacy HomeView behaviour.

  Intro choreography — see the file header of @/composables/useHomeScroll
  (section 4, "CUSTOM TIMELINES"): a self-contained `gsap.context` scoped to the
  section root plays a one-shot, staggered entrance (badge → masked title →
  gradient line → lead → CTAs → terminal). Under `prefers-reduced-motion` we set
  the static final state and build no timeline. All colours come from --home-*.
-->
<template>
  <section ref="root" class="home-section hero-section">
    <div class="home-container hero-grid">
      <div class="hero-copy">
        <p class="hero-badge" data-hero="badge">
          <span class="hero-badge__dot" aria-hidden="true"></span>
          {{ t('home.hero.badge') }}
        </p>

        <h1 class="home-h1 hero-title">
          <span class="hero-title__mask">
            <span class="hero-title__line" data-hero="title">{{ siteName }}</span>
          </span>
          <span class="hero-title__accent home-gradient-text" data-hero="subtitle">{{
            siteSubtitle
          }}</span>
        </h1>

        <p class="home-body hero-lead" data-hero="lead">{{ heroDescription }}</p>

        <div class="hero-cta">
          <RouterLink :to="primaryTo" class="hero-btn hero-btn--primary" data-hero="cta">
            {{ t('home.hero.primaryCta') }}
          </RouterLink>
          <a
            :href="secondaryHref"
            target="_blank"
            rel="noopener noreferrer"
            class="hero-btn hero-btn--ghost"
            data-hero="cta"
          >
            {{ t('home.hero.secondaryCta') }}
            <span class="hero-btn__arrow" aria-hidden="true">↗</span>
          </a>
        </div>
      </div>

      <div class="hero-visual" data-hero="terminal">
        <TerminalDemo />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore, useAuthStore } from '@/stores'
import { gsap, useReducedMotion, HOME_MOTION } from '@/composables/useHomeScroll'
import TerminalDemo from './TerminalDemo.vue'

const { t } = useI18n()
const appStore = useAppStore()
const authStore = useAuthStore()

// Documentation fallback when no doc URL is configured (matches legacy HomeView).
const GITHUB_URL = 'https://github.com/Wei-Shaw/sub2api'

// --- Value proposition copy (reuses site settings, falls back to i18n) -------
const siteName = computed(
  () => appStore.cachedPublicSettings?.site_name || appStore.siteName || 'Sub2API',
)
const siteSubtitle = computed(
  () => (appStore.cachedPublicSettings?.site_subtitle ?? '').trim() || t('home.heroSubtitle'),
)
const heroDescription = computed(() => t('home.heroDescription'))

// --- CTA targets -------------------------------------------------------------
const docUrl = computed(() => appStore.cachedPublicSettings?.doc_url || appStore.docUrl || '')
const secondaryHref = computed(() => docUrl.value || GITHUB_URL)
const dashboardPath = computed(() => (authStore.isAdmin ? '/admin/dashboard' : '/dashboard'))
const primaryTo = computed(() => (authStore.isAuthenticated ? dashboardPath.value : '/login'))

// --- Intro choreography ------------------------------------------------------
const root = ref<HTMLElement | null>(null)
const prefersReducedMotion = useReducedMotion()
let ctx: gsap.Context | null = null

onMounted(() => {
  if (!root.value) return

  ctx = gsap.context(() => {
    // Reduced motion → static final state, no timeline / ScrollTrigger.
    if (prefersReducedMotion.value) {
      gsap.set('[data-hero]', { opacity: 1, y: 0, yPercent: 0, clearProps: 'transform' })
      return
    }

    // One-shot, staggered entrance played on mount (the hero is above the fold).
    gsap
      .timeline({ defaults: { ease: HOME_MOTION.ease, duration: HOME_MOTION.duration } })
      .from('[data-hero="badge"]', { opacity: 0, y: HOME_MOTION.revealY })
      .from('[data-hero="title"]', { yPercent: 115, opacity: 0 }, '-=0.35')
      .from('[data-hero="subtitle"]', { opacity: 0, y: HOME_MOTION.revealY }, '-=0.45')
      .from('[data-hero="lead"]', { opacity: 0, y: HOME_MOTION.revealY }, '-=0.5')
      .from(
        '[data-hero="cta"]',
        { opacity: 0, y: HOME_MOTION.revealY, stagger: HOME_MOTION.stagger },
        '-=0.5',
      )
      .from('[data-hero="terminal"]', { opacity: 0, y: 36, scale: 0.96 }, '-=0.7')
  }, root.value)
})

onUnmounted(() => {
  ctx?.revert()
  ctx = null
})
</script>

<style scoped>
.hero-section {
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: clamp(42rem, 90vh, 58rem);
}

.hero-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(2.5rem, 6vw, 4rem);
  align-items: center;
}

@media (min-width: 64rem) {
  .hero-grid {
    grid-template-columns: 1.05fr 0.95fr;
  }
}

.hero-copy {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  max-width: 40rem;
}

/* --- Badge ---------------------------------------------------------------- */
.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  width: max-content;
  padding: 0.4rem 0.85rem;
  border: 1px solid var(--home-border);
  border-radius: 9999px;
  background: var(--home-surface);
  color: var(--home-text-dim);
  font-size: 0.82rem;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.hero-badge__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 9999px;
  background: var(--home-primary);
  box-shadow: 0 0 0 3px var(--home-primary-glow);
}

/* --- Title ---------------------------------------------------------------- */
.hero-title {
  display: flex;
  flex-direction: column;
  gap: 0.15em;
}

/* Mask wrapper for the brand line so it can slide up from a clipped edge. */
.hero-title__mask {
  display: block;
  overflow: hidden;
  padding-bottom: 0.08em;
}

.hero-title__line {
  display: block;
}

/* Gradient value-prop line — large but a clear step below the brand. */
.hero-title__accent {
  display: block;
  font-size: 0.6em;
  line-height: 1.12;
}

.hero-lead {
  max-width: 34rem;
}

/* --- CTAs ----------------------------------------------------------------- */
.hero-cta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.9rem;
  margin-top: 0.5rem;
}

.hero-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.85rem 1.6rem;
  border-radius: 9999px;
  font-size: 1rem;
  font-weight: 600;
  text-decoration: none;
  transition:
    transform 0.25s ease,
    box-shadow 0.25s ease,
    background-color 0.25s ease,
    border-color 0.25s ease;
}

.hero-btn--primary {
  color: var(--home-bg);
  background: linear-gradient(100deg, var(--home-primary), var(--home-accent));
  box-shadow: 0 12px 30px -10px var(--home-primary-glow);
}

.hero-btn--primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 42px -12px var(--home-primary-glow);
}

.hero-btn--ghost {
  color: var(--home-text);
  background: var(--home-surface);
  border: 1px solid var(--home-border);
}

.hero-btn--ghost:hover {
  transform: translateY(-2px);
  background: var(--home-surface-2);
}

.hero-btn__arrow {
  font-size: 0.95em;
}

/* --- Visual --------------------------------------------------------------- */
.hero-visual {
  display: flex;
  justify-content: center;
}

@media (min-width: 64rem) {
  .hero-visual {
    justify-content: flex-end;
  }
}
</style>
