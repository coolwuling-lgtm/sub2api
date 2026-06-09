<!--
  ProviderMarquee — infinite provider strip (Phase 2 / task #4)
  ----------------------------------------------------------------------------
  A seamless, edge-faded marquee of the supported providers (Claude / GPT /
  Gemini / Antigravity / More), reusing the existing `home.providers.*` copy.
  GPT is a brand proper-noun with no locale variant, so it is shown verbatim.

  Motion:
    • Default — a pure-CSS infinite scroll built from two identical groups
      translated by -50%; hovering the viewport pauses it.
    • Reduced motion — `prefersReducedMotion` (from useSectionReveal) swaps to a
      static, centred, wrapping row with no animation. The reduce-motion CSS
      layer in home-immersive.css is a second safety net.
  The heading carries `[data-reveal]` for the shared staggered fade-up.

  All colours come from the `--home-*` tokens; chips use `.home-glass`.
  Contract: see file header of @/composables/useHomeScroll.
-->
<template>
  <section ref="root" class="home-section provider-marquee">
    <div class="home-container provider-marquee__head">
      <h2 class="home-h2" data-reveal>{{ t('home.providers.title') }}</h2>
      <p class="home-body provider-marquee__desc" data-reveal>
        {{ t('home.providers.description') }}
      </p>
    </div>

    <!-- Reduced motion: static, wrapping, centred row (no infinite scroll). -->
    <ul v-if="prefersReducedMotion" class="provider-marquee__static" data-reveal>
      <li v-for="p in providers" :key="p.key" class="home-glass provider-chip">
        <Icon :name="p.icon" size="sm" class="provider-chip__icon" />
        <span class="provider-chip__label">{{ p.labelKey ? t(p.labelKey) : p.brand }}</span>
      </li>
    </ul>

    <!-- Motion: seamless infinite marquee (two identical groups, hover to pause). -->
    <div v-else class="provider-marquee__viewport">
      <div class="provider-marquee__track">
        <ul class="provider-marquee__group">
          <li v-for="(p, i) in marqueeChips" :key="`a-${i}`" class="home-glass provider-chip">
            <Icon :name="p.icon" size="sm" class="provider-chip__icon" />
            <span class="provider-chip__label">{{ p.labelKey ? t(p.labelKey) : p.brand }}</span>
          </li>
        </ul>
        <!-- Duplicate group makes the -50% translate loop seamless; hidden from AT. -->
        <ul class="provider-marquee__group" aria-hidden="true">
          <li v-for="(p, i) in marqueeChips" :key="`b-${i}`" class="home-glass provider-chip">
            <Icon :name="p.icon" size="sm" class="provider-chip__icon" />
            <span class="provider-chip__label">{{ p.labelKey ? t(p.labelKey) : p.brand }}</span>
          </li>
        </ul>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSectionReveal } from '@/composables/useHomeScroll'
import Icon from '@/components/icons/Icon.vue'

interface Provider {
  /** Stable key for v-for. */
  key: string
  /** Icon name (must be a valid key of the shared Icon component). */
  icon: 'sparkles' | 'chat' | 'bolt' | 'cube' | 'more'
  /** i18n key for the label, or '' when a verbatim brand string is used. */
  labelKey: string
  /** Verbatim brand label for proper-nouns without a locale variant. */
  brand: string
}

const { t } = useI18n()

const root = ref<HTMLElement | null>(null)
const { prefersReducedMotion } = useSectionReveal(root)

const providers: readonly Provider[] = [
  { key: 'claude', icon: 'sparkles', labelKey: 'home.providers.claude', brand: '' },
  { key: 'gpt', icon: 'chat', labelKey: '', brand: 'GPT' },
  { key: 'gemini', icon: 'bolt', labelKey: 'home.providers.gemini', brand: '' },
  { key: 'antigravity', icon: 'cube', labelKey: 'home.providers.antigravity', brand: '' },
  { key: 'more', icon: 'more', labelKey: 'home.providers.more', brand: '' },
]

// One marquee group repeats the list so a single group always exceeds the
// (container-capped) viewport width — a prerequisite for the seamless -50% loop.
const marqueeChips: readonly Provider[] = [...providers, ...providers]
</script>

<style scoped>
.provider-marquee__head {
  margin-bottom: clamp(2rem, 4vw, 3rem);
  text-align: center;
}

.provider-marquee__desc {
  margin-top: 0.75rem;
}

/* Viewport clips the scrolling track and fades both edges into the page. */
.provider-marquee__viewport {
  position: relative;
  width: 100%;
  max-width: var(--home-content-max);
  margin-inline: auto;
  overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
  mask-image: linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent);
}

.provider-marquee__track {
  display: flex;
  width: max-content;
  animation: provider-marquee-scroll 32s linear infinite;
}

/* Pause on hover so the brands are readable / clickable-feeling. */
.provider-marquee__viewport:hover .provider-marquee__track {
  animation-play-state: paused;
}

.provider-marquee__group {
  display: flex;
  align-items: center;
  gap: clamp(0.75rem, 1.5vw, 1.25rem);
  margin: 0;
  padding-inline: clamp(0.375rem, 0.75vw, 0.625rem);
  list-style: none;
}

@keyframes provider-marquee-scroll {
  from {
    transform: translateX(0);
  }
  to {
    transform: translateX(-50%);
  }
}

/* Reduced-motion static layout: centred, wrapping, no animation. */
.provider-marquee__static {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: clamp(0.75rem, 1.5vw, 1.25rem);
  max-width: var(--home-content-max);
  margin: 0 auto;
  padding: 0;
  list-style: none;
}

.provider-chip {
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 0.6rem;
  padding: 0.7rem 1.15rem;
  color: var(--home-text);
  font-weight: 600;
  font-size: clamp(0.95rem, 1.2vw, 1.1rem);
  white-space: nowrap;
  transition:
    transform 0.3s ease,
    border-color 0.3s ease,
    background-color 0.3s ease;
}

.provider-chip:hover {
  transform: translateY(-2px);
  border-color: var(--home-primary);
  background-color: var(--home-surface-2);
}

.provider-chip__icon {
  color: var(--home-primary);
}

.provider-chip__label {
  line-height: 1;
}
</style>
