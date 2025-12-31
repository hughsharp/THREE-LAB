// js/main.js

// 1. Initialize Lenis Smooth Scroll
if (window.Lenis) {
  const lenis = new Lenis({
    lerp: 0.1,
    wheelMultiplier: 1,
    gestureOrientation: "vertical",
    normalizeWheel: false,
    smoothTouch: false
  });

  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);

  // jQuery Bindings for Webflow interactions
  $("[data-lenis-start]").on("click", () => lenis.start());
  $("[data-lenis-stop]").on("click", () => lenis.stop());
}

// 2. Sound Logic
const backgroundMusic = new Audio("..."); // URLs from original code
// ... Copy sound toggle logic here ...

// 3. Text Scramble Effect (SplitType + GSAP)
document.addEventListener("DOMContentLoaded", () => {
  if (typeof SplitType === 'undefined' || typeof gsap === 'undefined') return;

  function scrambleAnimate(element, text, useSplitType = false) {
    // ... Copy the scramble logic from original script ...
  }

  document.querySelectorAll("[data-text]").forEach((el) => {
    scrambleAnimate(el, el.getAttribute("data-text"), true);
  });
});

// 4. Background Color Changer
document.addEventListener('DOMContentLoaded', () => {
  const changeBg = document.querySelector('.change-bg');
  const sections = document.querySelectorAll('[section-bg]');
  
  function updateBackground() {
    sections.forEach((section) => {
      const rect = section.getBoundingClientRect();
      if (rect.top <= window.innerHeight / 2 && rect.bottom >= window.innerHeight / 2) {
        const bgAttribute = section.getAttribute('section-bg');
        if (bgAttribute) changeBg.style.background = bgAttribute;
      }
    });
  }
  window.addEventListener('scroll', updateBackground);
});