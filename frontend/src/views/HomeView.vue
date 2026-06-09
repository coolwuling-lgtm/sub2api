<template>
  <!-- Custom Home Content: Full Page Mode (admin override — highest priority) -->
  <div v-if="homeContent" class="min-h-screen">
    <!-- iframe mode -->
    <iframe
      v-if="isHomeContentUrl"
      :src="homeContent.trim()"
      class="h-screen w-full border-0"
      allowfullscreen
    ></iframe>
    <!-- HTML mode - SECURITY: homeContent is admin-only setting, XSS risk is acceptable -->
    <div v-else v-html="homeContent"></div>
  </div>

  <!-- Default Home Page: immersive dark experience -->
  <div v-else class="home-immersive">
    <!-- Fixed decorative backdrop (mesh gradient + grid + parallax orbs). -->
    <HomeBackground />

    <!-- Content sits above the backdrop. -->
    <div class="home-immersive__content">
      <HomeHeader />

      <main class="home-immersive__main">
        <HeroSection />
        <ProviderMarquee />
        <FeaturesBento />
        <RequestFlowSection />
        <OneLineSwitchSection />
        <StatsSection />
        <CtaSection />
      </main>

      <HomeFooter />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAuthStore, useAppStore } from '@/stores'
import { useHomeScroll } from '@/composables/useHomeScroll'
import '@/styles/home-immersive.css'
import HomeBackground from '@/components/home/HomeBackground.vue'
import HomeHeader from '@/components/home/HomeHeader.vue'
import HeroSection from '@/components/home/HeroSection.vue'
import ProviderMarquee from '@/components/home/ProviderMarquee.vue'
import FeaturesBento from '@/components/home/FeaturesBento.vue'
import RequestFlowSection from '@/components/home/RequestFlowSection.vue'
import OneLineSwitchSection from '@/components/home/OneLineSwitchSection.vue'
import StatsSection from '@/components/home/StatsSection.vue'
import CtaSection from '@/components/home/CtaSection.vue'
import HomeFooter from '@/components/home/HomeFooter.vue'

const authStore = useAuthStore()
const appStore = useAppStore()

// --- Custom override mode -----------------------------------------------------
// Admin-configured home content takes highest priority and is rendered verbatim
// (iframe for a URL, raw HTML otherwise). The immersive homepage only renders
// when no override content is set. Resolved synchronously from the config that
// main.ts injects before mount.
const homeContent = computed(() => appStore.cachedPublicSettings?.home_content || '')
const isHomeContentUrl = computed(() => {
  const content = homeContent.value.trim()
  return content.startsWith('http://') || content.startsWith('https://')
})

// --- Immersive scroll orchestration ------------------------------------------
// Initialise GSAP + Lenis + reduce-motion handling ONLY when the immersive
// branch is active. In override mode the immersive tree is absent and we must
// not attach Lenis smooth-scrolling to the admin's raw iframe/HTML page.
// useHomeScroll registers its own onMounted (init) / onUnmounted (cleanup).
if (!homeContent.value) {
  useHomeScroll()
}

// --- Theme / auth / settings (preserved behaviour) ---------------------------
// Honour the saved/system theme preference by toggling the global `dark` class.
// (The theme toggle UI now lives in HomeHeader — Phase 2.) main.ts also runs an
// equivalent step at bootstrap; kept here for self-consistency.
function initTheme(): void {
  const savedTheme = localStorage.getItem('theme')
  const shouldUseDark =
    savedTheme === 'dark' ||
    (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', shouldUseDark)
}

onMounted(() => {
  initTheme()

  // Refresh auth state.
  authStore.checkAuth()

  // Ensure public settings are loaded (uses cache if already injected at boot).
  if (!appStore.publicSettingsLoaded) {
    appStore.fetchPublicSettings()
  }
})
</script>

<style scoped>
/* Content layer sits above the absolute HomeBackground (z-index 0). */
.home-immersive__content {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 100vh;
  flex-direction: column;
}

.home-immersive__main {
  flex: 1 1 auto;
}
</style>
