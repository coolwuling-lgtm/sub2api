<!--
  CtaSection — full-width glass call-to-action
  ----------------------------------------------------------------------------
  A single wide glass panel (i18n `home.cta.*`) that scales in as it enters the
  viewport, with a slow "breathing" glow behind it. The action button adapts to
  auth state: authenticated visitors go to their dashboard (admin → /admin/
  dashboard, otherwise → /dashboard), anonymous visitors go to /login.

  Motion contract: the scale-in is a custom `gsap.context` scoped to the root,
  with a static final state under reduced motion. The breathing glow is pure CSS;
  the global `prefers-reduced-motion` rule in home-immersive.css neutralises it.
  All colors come from the `--home-*` tokens in home-immersive.css.
-->
<template>
  <section ref="root" class="home-section cta-section">
    <div class="home-container">
      <div ref="cardEl" class="home-glass cta-card home-gpu">
        <div class="cta-card__glow" aria-hidden="true"></div>

        <div class="cta-card__body">
          <h2 class="home-h2 cta-card__title">{{ $t('home.cta.title') }}</h2>
          <p class="home-body cta-card__subtitle">{{ $t('home.cta.subtitle') }}</p>

          <RouterLink :to="ctaTarget" class="cta-card__button">
            {{ ctaLabel }}
          </RouterLink>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores'
import { gsap, HOME_MOTION, useReducedMotion } from '@/composables/useHomeScroll'

const { t } = useI18n()
const authStore = useAuthStore()
const prefersReducedMotion = useReducedMotion()

/** Authenticated → dashboard (role-aware); anonymous → login. */
const ctaTarget = computed(() => {
  if (!authStore.isAuthenticated) return '/login'
  return authStore.isAdmin ? '/admin/dashboard' : '/dashboard'
})

/** Label follows the destination: dashboard vs. sign-up. */
const ctaLabel = computed(() =>
  authStore.isAuthenticated ? t('home.goToDashboard') : t('home.cta.button'),
)

const root = ref<HTMLElement | null>(null)
const cardEl = ref<HTMLElement | null>(null)

let ctx: gsap.Context | null = null

onMounted(() => {
  if (!root.value || !cardEl.value) return
  const card = cardEl.value

  ctx = gsap.context(() => {
    // Reduced motion → static final state, no trigger.
    if (prefersReducedMotion.value) {
      gsap.set(card, { opacity: 1, scale: 1 })
      return
    }

    gsap.from(card, {
      opacity: 0,
      scale: 0.92,
      duration: HOME_MOTION.duration,
      ease: HOME_MOTION.ease,
      scrollTrigger: {
        trigger: card,
        start: 'top 85%',
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
.cta-card {
  position: relative;
  overflow: hidden;
  padding: clamp(2.5rem, 7vw, 5rem) clamp(1.5rem, 5vw, 4rem);
  text-align: center;
}

/* Breathing glow behind the panel (pure CSS; reduced-motion neutralises it). */
.cta-card__glow {
  position: absolute;
  inset: -40%;
  z-index: 0;
  background-image: radial-gradient(
    closest-side at 50% 50%,
    var(--home-primary-glow) 0%,
    transparent 70%
  );
  filter: blur(40px);
  opacity: 0.55;
  animation: cta-breathe 6s ease-in-out infinite alternate;
}

@keyframes cta-breathe {
  from {
    opacity: 0.35;
    transform: scale(0.92);
  }
  to {
    opacity: 0.7;
    transform: scale(1.08);
  }
}

.cta-card__body {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.1rem;
}

.cta-card__title {
  max-width: 32rem;
}

.cta-card__subtitle {
  max-width: 38rem;
}

.cta-card__button {
  margin-top: 0.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.95rem 2.4rem;
  border-radius: 9999px;
  font-size: var(--home-body);
  font-weight: 700;
  color: var(--home-bg);
  background-image: linear-gradient(
    100deg,
    var(--home-primary) 0%,
    var(--home-accent) 100%
  );
  box-shadow: 0 0.5rem 2rem var(--home-primary-glow);
  transition: transform 0.25s ease, box-shadow 0.25s ease;
}

.cta-card__button:hover {
  transform: translateY(-2px);
  box-shadow: 0 0.75rem 2.5rem var(--home-primary-glow);
}

.cta-card__button:focus-visible {
  outline: 2px solid var(--home-primary);
  outline-offset: 3px;
}
</style>
