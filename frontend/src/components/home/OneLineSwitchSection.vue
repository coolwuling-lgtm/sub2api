<!--
  OneLineSwitchSection — "switch in one line" code diff
  ----------------------------------------------------------------------------
  A unified-diff code block demonstrating the OpenAI-compatible drop-in: the only
  change is the `base_url` line. The removed line is dimmed/struck; the added line
  is rendered in the primary brand color and gets a left-to-right highlight sweep
  as the block enters the viewport. Copy comes from i18n `home.oneLine.*`.

  Motion contract: reveals (title/subtitle/note) use the shared `useSectionReveal`;
  the code-block fade-in + highlight sweep is a custom `gsap.context` scoped to the
  root. Under reduced motion both render their static final state — no triggers.
  All colors come from the `--home-*` tokens in home-immersive.css.
-->
<template>
  <section ref="root" class="home-section one-line-switch">
    <div class="home-container one-line-switch__container">
      <header class="one-line-switch__head">
        <h2 class="home-h2" data-reveal>{{ $t('home.oneLine.title') }}</h2>
        <p class="home-body one-line-switch__subtitle" data-reveal>
          {{ $t('home.oneLine.subtitle') }}
        </p>
      </header>

      <div ref="codeEl" class="home-glass one-line-switch__code home-gpu">
        <div class="one-line-switch__chrome" aria-hidden="true">
          <span class="one-line-switch__dot"></span>
          <span class="one-line-switch__dot"></span>
          <span class="one-line-switch__dot"></span>
        </div>

        <div class="one-line-switch__codeblock">
          <span class="code-line">
            <span class="code-line__gutter" aria-hidden="true">&nbsp;</span>
            <span class="code-line__text">from openai import OpenAI</span>
          </span>
          <span class="code-line">
            <span class="code-line__gutter" aria-hidden="true">&nbsp;</span>
            <span class="code-line__text">client = OpenAI(</span>
          </span>
          <span class="code-line code-line--removed">
            <span class="code-line__gutter" aria-hidden="true">-</span>
            <span class="code-line__text">    base_url="https://api.openai.com/v1",</span>
          </span>
          <span ref="addedEl" class="code-line code-line--added">
            <span class="code-line__highlight" aria-hidden="true"></span>
            <span class="code-line__gutter" aria-hidden="true">+</span>
            <span class="code-line__text">    base_url="https://your-gateway.example.com/v1",</span>
          </span>
          <span class="code-line">
            <span class="code-line__gutter" aria-hidden="true">&nbsp;</span>
            <span class="code-line__text">    api_key="YOUR_GATEWAY_KEY",</span>
          </span>
          <span class="code-line">
            <span class="code-line__gutter" aria-hidden="true">&nbsp;</span>
            <span class="code-line__text">)</span>
          </span>
        </div>
      </div>

      <p class="home-body one-line-switch__note" data-reveal>
        <span class="one-line-switch__note-dot" aria-hidden="true"></span>
        {{ $t('home.oneLine.note') }}
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import {
  gsap,
  HOME_MOTION,
  useSectionReveal,
} from '@/composables/useHomeScroll'

const root = ref<HTMLElement | null>(null)
const codeEl = ref<HTMLElement | null>(null)
const addedEl = ref<HTMLElement | null>(null)

// Shared reveal handles title/subtitle/note fade-up (and reduce-motion for them).
const { prefersReducedMotion } = useSectionReveal(root)

let ctx: gsap.Context | null = null

onMounted(() => {
  if (!root.value || !codeEl.value) return
  const code = codeEl.value
  const highlight = addedEl.value?.querySelector<HTMLElement>('.code-line__highlight') ?? null

  ctx = gsap.context(() => {
    // Reduced motion → static final state (block visible, highlight fully drawn).
    if (prefersReducedMotion.value) {
      gsap.set(code, { opacity: 1, y: 0 })
      if (highlight) gsap.set(highlight, { scaleX: 1, opacity: 1 })
      return
    }

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: code,
        start: 'top 80%',
        toggleActions: 'play none none none',
      },
    })

    tl.from(code, {
      opacity: 0,
      y: HOME_MOTION.revealY,
      duration: HOME_MOTION.duration,
      ease: HOME_MOTION.ease,
    })

    if (highlight) {
      tl.fromTo(
        highlight,
        { scaleX: 0, opacity: 0 },
        {
          scaleX: 1,
          opacity: 1,
          duration: HOME_MOTION.duration,
          ease: HOME_MOTION.ease,
        },
        '-=0.15',
      )
    }
  }, root.value)
})

onUnmounted(() => {
  ctx?.revert()
  ctx = null
})
</script>

<style scoped>
.one-line-switch__container {
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 4vw, 2.75rem);
}

.one-line-switch__head {
  max-width: 44rem;
}

.one-line-switch__subtitle {
  margin-top: 0.85rem;
}

/* --- Code surface --------------------------------------------------------- */
.one-line-switch__code {
  overflow: hidden;
  padding: 0;
}

.one-line-switch__chrome {
  display: flex;
  gap: 0.5rem;
  padding: 0.9rem 1.15rem;
  border-bottom: 1px solid var(--home-border);
}

.one-line-switch__dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 9999px;
  background-color: var(--home-surface-2);
}

/* Plain block container (NOT <pre>): line breaks come from block `.code-line`s,
   so no stray blank lines; indentation is preserved per-line via white-space. */
.one-line-switch__codeblock {
  padding: clamp(1rem, 3vw, 1.75rem) clamp(0.75rem, 2vw, 1.25rem);
  overflow-x: auto;
  font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(0.8rem, 1.05vw, 0.98rem);
  line-height: 1.85;
  color: var(--home-text);
}

/* --- Diff lines ----------------------------------------------------------- */
.code-line {
  position: relative;
  display: block;
  min-height: 1.85em;
}

.code-line__gutter {
  display: inline-block;
  width: 1.4em;
  position: relative;
  z-index: 1;
  text-align: center;
  color: var(--home-text-dim);
  user-select: none;
}

.code-line__text {
  position: relative;
  z-index: 1;
  white-space: pre;
}

/* Removed line: dimmed + struck, signalling it is being replaced. */
.code-line--removed {
  color: var(--home-text-dim);
}

.code-line--removed .code-line__gutter {
  color: var(--home-text-dim);
}

.code-line--removed .code-line__text {
  text-decoration: line-through;
  text-decoration-thickness: 1px;
  opacity: 0.7;
}

/* Added line: the one that switches — primary color + highlight sweep. */
.code-line--added {
  color: var(--home-primary);
}

.code-line--added .code-line__gutter {
  color: var(--home-primary);
  font-weight: 700;
}

/* Left-to-right highlight bar behind the added line (GSAP animates scaleX). */
.code-line__highlight {
  position: absolute;
  inset: 0 -0.5rem;
  z-index: 0;
  border-radius: var(--home-radius-sm);
  background-image: linear-gradient(
    90deg,
    var(--home-primary-glow) 0%,
    transparent 92%
  );
  transform: scaleX(0);
  transform-origin: left center;
  opacity: 0;
}

.one-line-switch__note {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  color: var(--home-text);
}

.one-line-switch__note-dot {
  flex: none;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 9999px;
  background-color: var(--home-primary);
  box-shadow: 0 0 0.75rem var(--home-primary-glow);
}
</style>
