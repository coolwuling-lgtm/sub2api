<!--
  TerminalDemo — GSAP typewriter terminal (immersive homepage)
  ----------------------------------------------------------------------------
  Upgrade of the legacy CSS-keyframe terminal: a faux terminal window that types
  a sample gateway request line-by-line / character-by-character with per-token
  syntax highlighting, a blinking caret, and a subtle 3D-perspective hover.

  Choreography contract — see the file header of @/composables/useHomeScroll
  (section 4, "CUSTOM TIMELINES"):
    • Typing runs on a single GSAP timeline scoped to this component's root via
      `gsap.context(fn, root.value)`, reverted on unmount.
    • A ScrollTrigger starts the loop when the terminal enters the viewport and
      pauses it when it leaves (cheap when off-screen). The timeline then loops.
    • Under `prefers-reduced-motion` we render the final, fully-typed state with
      no timeline and no ScrollTrigger, and the caret stops blinking.

  All colours come from the `--home-*` tokens in home-immersive.css — the token
  highlight classes map onto the brand palette (teal / violet / magenta) rather
  than hardcoded hex values.
-->
<template>
  <div
    ref="root"
    class="terminal home-gpu"
    :class="{ 'terminal--static': prefersReducedMotion }"
    aria-hidden="true"
  >
    <!-- Window chrome -->
    <div class="terminal__bar">
      <span class="terminal__dot terminal__dot--close"></span>
      <span class="terminal__dot terminal__dot--min"></span>
      <span class="terminal__dot terminal__dot--max"></span>
      <span class="terminal__title">sub2api — curl</span>
    </div>

    <!-- Typed body. Token spans start empty; GSAP fills `textContent`. -->
    <div class="terminal__body">
      <div v-for="(line, li) in LINES" :key="li" class="terminal__line">
        <span
          v-for="(tok, ti) in line"
          :key="ti"
          class="tok"
          :class="tok.cls"
          :data-text="tok.text"
          :data-first="ti === 0 ? 'true' : null"
        ></span>
        <span v-if="li === LINES.length - 1" class="terminal__cursor"></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { gsap, useReducedMotion } from '@/composables/useHomeScroll'
import { TextPlugin } from 'gsap/TextPlugin'

// TextPlugin drives the character-by-character typing. Registration is
// idempotent; the shared `gsap` singleton already has ScrollTrigger registered
// via the useHomeScroll import side-effect.
gsap.registerPlugin(TextPlugin)

/** A highlighted fragment of a terminal line. */
interface TerminalToken {
  /** Literal text to type (trailing spaces are intentional / preserved). */
  text: string
  /** Token highlight class — see scoped styles for the palette mapping. */
  cls: string
}

// The demo request: client call → routing note → success response → prompt.
const LINES: ReadonlyArray<ReadonlyArray<TerminalToken>> = [
  [
    { text: '$ ', cls: 'tok-prompt' },
    { text: 'curl ', cls: 'tok-cmd' },
    { text: '-X POST ', cls: 'tok-flag' },
    { text: '/v1/messages', cls: 'tok-url' },
  ],
  [{ text: '# routing to a healthy upstream…', cls: 'tok-comment' }],
  [
    { text: '200 OK', cls: 'tok-success' },
    { text: '  { "content": "Hello!" }', cls: 'tok-response' },
  ],
  [{ text: '$ ', cls: 'tok-prompt' }],
]

// Typing speed (seconds per character) and the minimum duration per token so a
// one or two character token still reads as "typed", not "popped".
const SECONDS_PER_CHAR = 0.04
const MIN_TOKEN_DURATION = 0.2
/** Extra beat inserted before each new line starts typing. */
const LINE_GAP = 0.35

const root = ref<HTMLElement | null>(null)
const prefersReducedMotion = useReducedMotion()

let ctx: gsap.Context | null = null

onMounted(() => {
  const el = root.value
  if (!el) return

  const spans = Array.from(el.querySelectorAll<HTMLElement>('.tok'))
  if (!spans.length) return

  // Reduced motion → static final state: fill every token, no timeline/trigger.
  if (prefersReducedMotion.value) {
    spans.forEach((span) => {
      span.textContent = span.dataset.text ?? ''
    })
    return
  }

  ctx = gsap.context(() => {
    const timeline = gsap.timeline({
      repeat: -1,
      repeatDelay: 3.2,
      scrollTrigger: {
        trigger: el,
        start: 'top 85%',
        // Play on enter, pause off-screen, resume on re-entry — cheap when idle.
        toggleActions: 'play pause resume pause',
      },
    })

    // Clear at the head of every cycle so the loop retypes from empty.
    timeline.set(spans, { text: '' })

    spans.forEach((span) => {
      const text = span.dataset.text ?? ''
      const duration = Math.max(MIN_TOKEN_DURATION, text.length * SECONDS_PER_CHAR)
      const position = span.dataset.first === 'true' ? `>+=${LINE_GAP}` : '>'
      timeline.to(
        span,
        { duration, ease: 'none', text: { value: text, delimiter: '' } },
        position,
      )
    })
  }, el)
})

onUnmounted(() => {
  ctx?.revert()
  ctx = null
})
</script>

<style scoped>
/* Terminal window — dark panel that leans on the home palette for its glow. */
.terminal {
  width: 100%;
  max-width: 30rem;
  overflow: hidden;
  border: 1px solid var(--home-border);
  border-radius: var(--home-radius-sm);
  background: linear-gradient(155deg, var(--home-bg-2), var(--home-bg));
  box-shadow:
    0 30px 60px -22px var(--home-shadow),
    0 0 40px -10px var(--home-primary-glow);
  transform: perspective(1200px) rotateX(3deg) rotateY(-4deg);
  transform-style: preserve-3d;
  transition:
    transform 0.45s cubic-bezier(0.22, 0.61, 0.36, 1),
    box-shadow 0.45s ease;
}

/* Flatten + lift on hover for a tactile, 3D feel. */
.terminal:hover {
  transform: perspective(1200px) rotateX(0deg) rotateY(0deg) translateY(-6px);
  box-shadow:
    0 42px 80px -26px var(--home-shadow-strong),
    0 0 64px -8px var(--home-primary-glow);
}

/* --- Window chrome -------------------------------------------------------- */
.terminal__bar {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.7rem 0.9rem;
  background: var(--home-surface);
  border-bottom: 1px solid var(--home-border);
}

.terminal__dot {
  width: 0.7rem;
  height: 0.7rem;
  border-radius: 9999px;
  opacity: 0.85;
}

/* Traffic-light dots reuse the brand palette instead of red/yellow/green. */
.terminal__dot--close {
  background: var(--home-accent-2);
}
.terminal__dot--min {
  background: var(--home-accent);
}
.terminal__dot--max {
  background: var(--home-primary);
}

.terminal__title {
  margin-left: 0.4rem;
  font-family: ui-monospace, 'Fira Code', SFMono-Regular, Menlo, monospace;
  font-size: 0.78rem;
  color: var(--home-text-dim);
}

/* --- Typed body ----------------------------------------------------------- */
.terminal__body {
  min-height: 8.5rem;
  padding: 1.1rem 1.25rem 1.4rem;
  font-family: ui-monospace, 'Fira Code', SFMono-Regular, Menlo, monospace;
  font-size: 0.85rem;
  line-height: 1.9;
  white-space: pre-wrap;
  word-break: break-word;
}

.terminal__line {
  display: block;
}

.tok {
  white-space: pre-wrap;
}

/* Token highlight palette — all mapped onto --home-* tokens. */
.tok-prompt {
  color: var(--home-primary);
  font-weight: 700;
}
.tok-cmd {
  color: var(--home-accent);
}
.tok-flag {
  color: var(--home-accent-2);
}
.tok-url {
  color: var(--home-primary);
}
.tok-comment {
  color: var(--home-text-dim);
  font-style: italic;
}
.tok-success {
  padding: 0.05rem 0.45rem;
  border-radius: 0.4rem;
  background: var(--home-surface-2);
  color: var(--home-primary);
  font-weight: 600;
}
.tok-response {
  color: var(--home-text);
}

/* --- Blinking caret ------------------------------------------------------- */
.terminal__cursor {
  display: inline-block;
  width: 0.55ch;
  height: 1.05em;
  margin-left: 0.12rem;
  background: var(--home-primary);
  vertical-align: text-bottom;
  animation: terminal-blink 1.05s steps(1) infinite;
}

@keyframes terminal-blink {
  0%,
  49% {
    opacity: 1;
  }
  50%,
  100% {
    opacity: 0;
  }
}

/* Reduced motion → steady, visible caret (no blink). */
.terminal--static .terminal__cursor {
  animation: none;
  opacity: 1;
}
</style>
