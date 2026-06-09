<!--
  HomeBackground — fixed immersive backdrop (sets the visual tone)
  ----------------------------------------------------------------------------
  Pure-CSS mesh-gradient light orbs (teal primary + violet/magenta accents) over
  the deep-space base, a fine grid, and an edge vignette. The orbs carry
  `data-parallax` so they drift gently as the page scrolls; `useSectionReveal`
  (scoped to this root) wires that parallax and skips it under reduced motion.

  All colors come from the `--home-*` tokens defined in home-immersive.css.
  This layer is decorative and non-interactive (`aria-hidden`, pointer-events
  none) and sits behind all content.
-->
<template>
  <div ref="root" class="home-background" aria-hidden="true">
    <div class="home-background__mesh"></div>
    <div class="home-background__orb home-background__orb--teal" data-parallax="-10"></div>
    <div class="home-background__orb home-background__orb--violet" data-parallax="16"></div>
    <div class="home-background__orb home-background__orb--magenta" data-parallax="-6"></div>
    <div class="home-background__grid"></div>
    <div class="home-background__vignette"></div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useSectionReveal } from '@/composables/useHomeScroll'

// Reference implementation of the section contract: own root + useSectionReveal.
// There are no [data-reveal] targets here — only decorative [data-parallax] orbs.
const root = ref<HTMLElement | null>(null)
useSectionReveal(root)
</script>

<style scoped>
.home-background {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

/* Soft mesh of radial gradients painting the ambient color field. */
.home-background__mesh {
  position: absolute;
  inset: -10%;
  background-image:
    radial-gradient(40% 50% at 18% 22%, var(--home-primary-glow), transparent 70%),
    radial-gradient(36% 44% at 82% 16%, var(--home-accent), transparent 72%),
    radial-gradient(48% 52% at 70% 82%, var(--home-accent-2), transparent 74%),
    radial-gradient(60% 60% at 30% 88%, var(--home-bg-2), transparent 80%);
  opacity: 0.5;
  filter: saturate(120%);
}

/* Individual blurred orbs that parallax for depth. */
.home-background__orb {
  position: absolute;
  border-radius: 9999px;
  filter: blur(80px);
  will-change: transform;
}

.home-background__orb--teal {
  top: -8%;
  left: -6%;
  width: clamp(20rem, 38vw, 38rem);
  height: clamp(20rem, 38vw, 38rem);
  background: radial-gradient(circle at center, var(--home-primary) 0%, transparent 68%);
  opacity: 0.28;
}

.home-background__orb--violet {
  top: 8%;
  right: -10%;
  width: clamp(18rem, 34vw, 34rem);
  height: clamp(18rem, 34vw, 34rem);
  background: radial-gradient(circle at center, var(--home-accent) 0%, transparent 66%);
  opacity: 0.24;
}

.home-background__orb--magenta {
  bottom: -12%;
  left: 28%;
  width: clamp(22rem, 40vw, 40rem);
  height: clamp(22rem, 40vw, 40rem);
  background: radial-gradient(circle at center, var(--home-accent-2) 0%, transparent 70%);
  opacity: 0.18;
}

/* Fine technical grid, very low contrast. */
.home-background__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(var(--home-border) 1px, transparent 1px),
    linear-gradient(90deg, var(--home-border) 1px, transparent 1px);
  background-size: 64px 64px;
  /* Fade the grid toward the edges so it never dominates. */
  -webkit-mask-image: radial-gradient(120% 90% at 50% 30%, #000 35%, transparent 80%);
  mask-image: radial-gradient(120% 90% at 50% 30%, #000 35%, transparent 80%);
  opacity: 0.5;
}

/* Vignette to deepen the corners and anchor content. */
.home-background__vignette {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 120% at 50% 0%, transparent 55%, var(--home-bg) 100%),
    linear-gradient(to bottom, transparent 60%, var(--home-bg) 100%);
}
</style>
