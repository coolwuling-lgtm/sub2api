<!--
  HomeHeader — immersive top bar for the dark HomeView
  ----------------------------------------------------------------------------
  A sticky glass navigation bar. The background starts fully transparent and
  fades into the `.home-glass` surface once the page is scrolled (driven by a
  passive scroll listener that just toggles a class — the visual change is a
  pure-CSS transition, so it is automatically neutralised under reduce-motion by
  the `.home-immersive` media query in home-immersive.css; no manual bypass).

  Carries the navigation surface lifted out of HomeView: brand logo + name,
  LocaleSwitcher, documentation link (appStore.doc_url), the global light/dark
  theme toggle (toggles the `dark` class + persists to localStorage), and a
  login-or-dashboard CTA driven by the auth store.

  All colors reference the `--home-*` tokens from home-immersive.css.
-->
<template>
  <header ref="root" class="home-header" :class="{ 'home-header--scrolled': scrolled }">
    <div class="home-header__inner">
      <!-- Brand -->
      <router-link to="/" class="home-header__brand" :aria-label="siteName">
        <span class="home-header__logo">
          <img :src="siteLogo || '/logo.png'" :alt="siteName" class="home-header__logo-img" />
        </span>
        <span class="home-header__name">{{ siteName }}</span>
      </router-link>

      <!-- Actions -->
      <nav class="home-header__actions" :aria-label="t('home.viewDocs')">
        <span class="home-header__locale">
          <LocaleSwitcher />
        </span>

        <a
          v-if="docUrl"
          :href="docUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="home-header__icon-btn"
          :title="t('home.viewDocs')"
          :aria-label="t('home.viewDocs')"
        >
          <Icon name="book" size="md" />
        </a>

        <button
          type="button"
          class="home-header__icon-btn"
          :title="isDark ? t('home.switchToLight') : t('home.switchToDark')"
          :aria-label="isDark ? t('home.switchToLight') : t('home.switchToDark')"
          @click="toggleTheme"
        >
          <Icon :name="isDark ? 'sun' : 'moon'" size="md" />
        </button>

        <router-link
          v-if="isAuthenticated"
          :to="dashboardPath"
          class="home-header__cta home-header__cta--dashboard"
        >
          <span class="home-header__avatar">{{ userInitial }}</span>
          <span>{{ t('home.dashboard') }}</span>
          <Icon name="arrowRight" size="xs" class="home-header__cta-arrow" />
        </router-link>
        <router-link v-else to="/login" class="home-header__cta">
          {{ t('home.login') }}
        </router-link>
      </nav>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useAppStore } from '@/stores'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import Icon from '@/components/icons/Icon.vue'

const { t } = useI18n()
const authStore = useAuthStore()
const appStore = useAppStore()

// Site branding / settings — resolved synchronously from the injected config.
const siteName = computed(
  () => appStore.cachedPublicSettings?.site_name || appStore.siteName || 'Sub2API',
)
const siteLogo = computed(
  () => appStore.cachedPublicSettings?.site_logo || appStore.siteLogo || '',
)
const docUrl = computed(() => appStore.cachedPublicSettings?.doc_url || appStore.docUrl || '')

// Auth-driven CTA.
const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAdmin = computed(() => authStore.isAdmin)
const dashboardPath = computed(() => (isAdmin.value ? '/admin/dashboard' : '/dashboard'))
const userInitial = computed(() => authStore.user?.email?.charAt(0).toUpperCase() ?? '')

// Global theme toggle (preserved from the original HomeView). The immersive
// homepage is always dark visually, but this still controls the app-wide theme.
const isDark = ref(document.documentElement.classList.contains('dark'))
function toggleTheme(): void {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// Fade the bar into glass once the page leaves the very top.
const SCROLL_REVEAL_THRESHOLD = 16
const root = ref<HTMLElement | null>(null)
const scrolled = ref(false)
function syncScrolled(): void {
  scrolled.value = window.scrollY > SCROLL_REVEAL_THRESHOLD
}

onMounted(() => {
  syncScrolled()
  window.addEventListener('scroll', syncScrolled, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', syncScrolled)
})
</script>

<style scoped>
.home-header {
  position: sticky;
  top: 0;
  z-index: 30;
  padding-block: 0.85rem;
  padding-inline: var(--home-gutter);
  background-color: transparent;
  border-bottom: 1px solid transparent;
  transition:
    background-color 0.3s ease,
    border-color 0.3s ease,
    backdrop-filter 0.3s ease;
}

/* Scrolled state mirrors `.home-glass` (sans corner radius) using the tokens. */
.home-header--scrolled {
  background-color: var(--home-surface);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom-color: var(--home-border);
}

.home-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  max-width: var(--home-content-max);
  margin-inline: auto;
}

/* --- Brand ---------------------------------------------------------------- */
.home-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
}

.home-header__logo {
  display: block;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.7rem;
  overflow: hidden;
  border: 1px solid var(--home-border);
  background-color: var(--home-surface);
}

.home-header__logo-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.home-header__name {
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: -0.01em;
  color: var(--home-text);
}

/* --- Actions -------------------------------------------------------------- */
.home-header__actions {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

/* Keep the shared LocaleSwitcher legible on the dark glass bar regardless of
   the global light/dark theme (it ships with light-theme defaults). */
.home-header__locale :deep(button) {
  color: var(--home-text-dim);
}
.home-header__locale :deep(button:hover) {
  background-color: var(--home-surface);
  color: var(--home-text);
}

.home-header__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--home-radius-sm);
  color: var(--home-text-dim);
  border: 1px solid transparent;
  background-color: transparent;
  cursor: pointer;
  transition:
    background-color 0.2s ease,
    color 0.2s ease,
    border-color 0.2s ease;
}

.home-header__icon-btn:hover {
  color: var(--home-text);
  background-color: var(--home-surface);
  border-color: var(--home-border);
}

/* --- CTA ------------------------------------------------------------------ */
.home-header__cta {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  margin-left: 0.25rem;
  padding: 0.45rem 1rem;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--home-text);
  text-decoration: none;
  background-image: linear-gradient(100deg, var(--home-primary), var(--home-accent));
  box-shadow: 0 10px 26px -10px var(--home-primary-glow);
  transition:
    transform 0.2s ease,
    box-shadow 0.2s ease,
    opacity 0.2s ease;
}

.home-header__cta:hover {
  transform: translateY(-1px);
  box-shadow: 0 14px 30px -10px var(--home-primary-glow);
  opacity: 0.95;
}

.home-header__cta--dashboard {
  padding-left: 0.4rem;
}

.home-header__avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--home-text);
  background-color: var(--home-bg);
}

.home-header__cta-arrow {
  opacity: 0.85;
}
</style>
