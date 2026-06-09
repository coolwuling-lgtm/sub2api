<!--
  FeaturesBento — core-capability bento grid (Phase 2 / task #4)
  ----------------------------------------------------------------------------
  Asymmetric bento presenting the three core capabilities (unified gateway /
  account pool / usage-based billing) reusing the existing `home.features.*`
  copy. One large featured tile (unified gateway) anchors a 2×2 cell, with the
  reliability + billing tiles stacked alongside it for an off-grid rhythm.

  Motion: each tile carries `[data-reveal]`, so `useSectionReveal(root)` runs the
  shared staggered fade-up (plays once, reduce-motion → static). Hover micro-
  interactions (lift + glow + icon tint) are CSS transitions, which the
  reduce-motion CSS layer in home-immersive.css neutralises automatically.

  All colours come from the `--home-*` tokens; surfaces use `.home-glass`.
  Contract: see file header of @/composables/useHomeScroll.
-->
<template>
  <section ref="root" class="home-section features-bento">
    <div class="home-container">
      <h2 class="home-h2 features-bento__title" data-reveal>
        {{ t('home.features.title') }}
      </h2>

      <div class="features-bento__grid">
        <article
          v-for="tile in tiles"
          :key="tile.area"
          class="home-glass feature-tile"
          :class="`feature-tile--${tile.area}`"
          data-reveal
        >
          <span class="feature-tile__icon" aria-hidden="true">
            <Icon :name="tile.icon" size="lg" />
          </span>
          <h3 class="feature-tile__title">{{ t(tile.titleKey) }}</h3>
          <p class="feature-tile__desc">{{ t(tile.descKey) }}</p>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSectionReveal } from '@/composables/useHomeScroll'
import Icon from '@/components/icons/Icon.vue'

type BentoArea = 'lead' | 'a' | 'b'

interface FeatureTile {
  /** Bento grid placement. */
  area: BentoArea
  /** Icon name (must be a valid key of the shared Icon component). */
  icon: 'link' | 'server' | 'chartBar'
  /** i18n key for the tile heading. */
  titleKey: string
  /** i18n key for the tile description. */
  descKey: string
}

const { t } = useI18n()

const root = ref<HTMLElement | null>(null)
useSectionReveal(root)

// Core capabilities, reusing the existing home.features.* copy. The lead tile
// (unified gateway) is the featured cell; reliability + billing stack beside it.
const tiles: readonly FeatureTile[] = [
  {
    area: 'lead',
    icon: 'link',
    titleKey: 'home.features.unifiedGateway',
    descKey: 'home.features.unifiedGatewayDesc',
  },
  {
    area: 'a',
    icon: 'server',
    titleKey: 'home.features.multiAccount',
    descKey: 'home.features.multiAccountDesc',
  },
  {
    area: 'b',
    icon: 'chartBar',
    titleKey: 'home.features.balanceQuota',
    descKey: 'home.features.balanceQuotaDesc',
  },
]
</script>

<style scoped>
.features-bento__title {
  margin-bottom: clamp(2rem, 4vw, 3rem);
  text-align: center;
}

.features-bento__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: clamp(0.875rem, 1.6vw, 1.25rem);
}

/* Asymmetric bento: a large 2×2 lead tile + two stacked tiles on the right. */
@media (min-width: 768px) {
  .features-bento__grid {
    grid-template-columns: 1.3fr 1.3fr 1fr;
    grid-template-areas:
      'lead lead side-a'
      'lead lead side-b';
  }

  .feature-tile--lead {
    grid-area: lead;
  }

  .feature-tile--a {
    grid-area: side-a;
  }

  .feature-tile--b {
    grid-area: side-b;
  }
}

.feature-tile {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: clamp(1.5rem, 2.4vw, 2.25rem);
  overflow: hidden;
  isolation: isolate;
  transition:
    transform 0.35s ease,
    border-color 0.35s ease,
    background-color 0.35s ease,
    box-shadow 0.35s ease;
}

/* Decorative corner glow that brightens on hover. Token-driven, non-interactive. */
.feature-tile::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: radial-gradient(120% 90% at 100% 0%, var(--home-primary-glow), transparent 60%);
  opacity: 0;
  transition: opacity 0.35s ease;
}

.feature-tile:hover {
  transform: translateY(-4px);
  background-color: var(--home-surface-2);
  border-color: var(--home-primary);
  box-shadow: 0 22px 60px -28px var(--home-primary-glow);
}

.feature-tile:hover::after {
  opacity: 0.5;
}

.feature-tile__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border-radius: var(--home-radius-sm);
  border: 1px solid var(--home-border);
  background-color: var(--home-surface-2);
  color: var(--home-primary);
  transition:
    transform 0.35s ease,
    background-color 0.35s ease,
    color 0.35s ease;
}

.feature-tile:hover .feature-tile__icon {
  transform: scale(1.06);
  background-color: var(--home-primary-glow);
  color: var(--home-text);
}

.feature-tile__title {
  font-size: clamp(1.15rem, 1.8vw, 1.45rem);
  font-weight: 700;
  letter-spacing: var(--home-title-tracking);
  color: var(--home-text);
}

.feature-tile__desc {
  margin: 0;
  font-size: 1rem;
  line-height: 1.6;
  color: var(--home-text-dim);
}

/* Featured lead tile: larger icon + heading, roomier spacing. */
.feature-tile--lead {
  gap: 1.1rem;
}

.feature-tile--lead .feature-tile__icon {
  width: 3.5rem;
  height: 3.5rem;
}

.feature-tile--lead .feature-tile__title {
  font-size: clamp(1.4rem, 2.6vw, 2rem);
}

.feature-tile--lead .feature-tile__desc {
  font-size: clamp(1rem, 1.3vw, 1.1rem);
}

/* On the bento layout, anchor the lead copy to the bottom of its tall cell. */
@media (min-width: 768px) {
  .feature-tile--lead {
    justify-content: flex-end;
  }

  .feature-tile--lead .feature-tile__icon {
    margin-bottom: auto;
  }
}
</style>
