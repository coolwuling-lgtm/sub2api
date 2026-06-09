<!--
  HomeFooter — closing bar for the immersive dark HomeView
  ----------------------------------------------------------------------------
  Copyright line + documentation and GitHub links. Its content fades up via the
  shared section-reveal contract (`useSectionReveal(root)` + `[data-reveal]`),
  which renders a static final state under reduce-motion — no manual bypass.

  All colors reference the `--home-*` tokens from home-immersive.css.
-->
<template>
  <footer ref="root" class="home-footer">
    <div class="home-footer__inner home-container">
      <p class="home-footer__copy" data-reveal>
        &copy; {{ currentYear }} {{ siteName }}. {{ t('home.footer.allRightsReserved') }}
      </p>

      <nav class="home-footer__links" data-reveal :aria-label="t('home.docs')">
        <a
          v-if="docUrl"
          :href="docUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="home-footer__link"
        >
          {{ t('home.docs') }}
        </a>
        <a
          :href="githubUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="home-footer__link"
        >
          GitHub
        </a>
      </nav>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores'
import { useSectionReveal } from '@/composables/useHomeScroll'

const { t } = useI18n()
const appStore = useAppStore()

const siteName = computed(
  () => appStore.cachedPublicSettings?.site_name || appStore.siteName || 'Sub2API',
)
const docUrl = computed(() => appStore.cachedPublicSettings?.doc_url || appStore.docUrl || '')
const currentYear = computed(() => new Date().getFullYear())

// Source repository for this project.
const githubUrl = 'https://github.com/Wei-Shaw/sub2api'

// Shared reveal contract: staggered fade-up, static under reduce-motion.
const root = ref<HTMLElement | null>(null)
useSectionReveal(root)
</script>

<style scoped>
.home-footer {
  position: relative;
  z-index: 10;
  padding-block: 2.5rem;
  padding-inline: var(--home-gutter);
  border-top: 1px solid var(--home-border);
  background-color: var(--home-bg-2);
}

.home-footer__inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  text-align: center;
}

.home-footer__copy {
  font-size: 0.875rem;
  color: var(--home-text-dim);
}

.home-footer__links {
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.home-footer__link {
  font-size: 0.875rem;
  color: var(--home-text-dim);
  text-decoration: none;
  transition: color 0.2s ease;
}

.home-footer__link:hover {
  color: var(--home-text);
}

@media (min-width: 640px) {
  .home-footer__inner {
    flex-direction: row;
    text-align: left;
  }
}
</style>
