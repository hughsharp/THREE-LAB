import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';

/* =========================================
   1. Setup TWEEN Animation Loop
   ========================================= */
function animate(time) {
  requestAnimationFrame(animate);
  TWEEN.update(time);
}
requestAnimationFrame(animate);

/* =========================================
   2. Utilities & Constants
   ========================================= */
// RGB equivalents for your colors
// Dark: #393736 -> rgb(57, 55, 54)
// Light: #A6A19D -> rgb(166, 161, 157)
const COLOR_DARK = { r: 57, g: 55, b: 54 };
const COLOR_LIGHT = { r: 166, g: 161, b: 157 };

// Store the current color state for elements to prevent conflicts
const elementStates = new WeakMap();

/**
 * Tweens an element's background color.
 * Replicates GSAP's "overwrite: auto" by storing state in a WeakMap.
 */
function transitionColor(element, targetRGB, duration = 200, instant = false) {
  // Initialize state if first time
  if (!elementStates.has(element)) {
    elementStates.set(element, { 
      r: 57, g: 55, b: 54, // Assume starts dark
      tween: null 
    });
  }

  const state = elementStates.get(element);

  // Stop any active tween on this element
  if (state.tween) {
    state.tween.stop();
  }

  // If "instant" (like gsap.set), update immediately and return
  if (instant) {
    state.r = targetRGB.r;
    state.g = targetRGB.g;
    state.b = targetRGB.b;
    element.style.backgroundColor = `rgb(${Math.round(state.r)}, ${Math.round(state.g)}, ${Math.round(state.b)})`;
    state.tween = null;
    return;
  }

  // Otherwise, animate from CURRENT state values to TARGET values
  state.tween = new TWEEN.Tween(state)
    .to({ r: targetRGB.r, g: targetRGB.g, b: targetRGB.b }, duration)
    .easing(TWEEN.Easing.Quadratic.Out)
    .onUpdate(() => {
      element.style.backgroundColor = `rgb(${Math.round(state.r)}, ${Math.round(state.g)}, ${Math.round(state.b)})`;
    })
    .start();
}

/* =========================================
   3. Scroll Logic
   ========================================= */
document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("scroll", () => {
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrollTop = window.scrollY;
    
    // Calculate scroll percentage, capped at 100
    const scrollPercent = Math.min((scrollTop / scrollHeight) * 100, 100);

    document.querySelectorAll(".progress-bar-wrap").forEach((progressBarWrap) => {
      const dot1 = progressBarWrap.querySelector(".progresbar_dot-1");
      const line = progressBarWrap.querySelector(".progress_line .progress_time-line");
      const dot2 = progressBarWrap.querySelector(".progresbar_dot-2");

      // --- Dot 1 Logic ---
      // 0-3%: Snap to Dark
      if (scrollPercent <= 3) {
        transitionColor(dot1, COLOR_DARK, 0, true); // instant
      }

      // 3-10%: Animate to Light
      if (scrollPercent > 3 && scrollPercent <= 10) {
        transitionColor(dot1, COLOR_LIGHT, 200);
      }

      // --- Line Logic (Scrubbing) ---
      // This maps directly to scroll position, so no TWEEN needed (GSAP used .set here anyway)
      if (scrollPercent <= 10) {
        line.style.height = "0%";
      } else if (scrollPercent > 10 && scrollPercent <= 95) {
        const heightPercent = ((scrollPercent - 10) / 85) * 100;
        line.style.height = `${heightPercent}%`;
      } else if (scrollPercent >= 99.9) {
        line.style.height = "100%";
      }

      // --- Dot 2 Logic ---
      // > 95%: Animate Light, Otherwise: Animate Dark
      if (scrollPercent > 95) {
        transitionColor(dot2, COLOR_LIGHT, 200);
      } else {
        transitionColor(dot2, COLOR_DARK, 200);
      }
    });
  });
});