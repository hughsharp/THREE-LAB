/* =========================================
   Blinking Blocks Logic
   ========================================= */
document.addEventListener("DOMContentLoaded", () => {
  {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const elements = entry.target.querySelectorAll(".blinking-decor-block");
        if (entry.isIntersecting) {
          elements.forEach((el) => el.classList.remove("inactive"));
        } else {
          elements.forEach((el) => el.classList.add("inactive"));
        }
      });
    });

    const target = document.querySelector(".blinking-decor-block-wrap");
    if (target) observer.observe(target);
  }
});

/* =========================================
   Text Color & Hover Mask Logic
   ========================================= */
document.addEventListener("DOMContentLoaded", () => {
  {
    const sections = document.querySelectorAll("[data-text-color]");
    const responsiveTexts = document.querySelectorAll("[data-responsive-text='true']");
    const lineMaskLinks = document.querySelectorAll("[line-mask-link]");
    const menu = document.querySelector("[data-menu]");

    const defaultColor = "#070707";
    const defaultBgColor = "transparent";

    responsiveTexts.forEach((textElement) => {
      textElement.style.color = defaultColor;
      textElement.style.backgroundColor = defaultBgColor;
      textElement.style.setProperty("--shadow-color", defaultColor);
    });

    let activeColor = defaultColor;
    let activeBgColor = defaultBgColor;

    function getActiveSection() {
      let foundSection = null;
      sections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top < window.innerHeight * 0.5 && rect.bottom > window.innerHeight * 0.5) {
          foundSection = section;
        }
      });
      return foundSection;
    }

    function updateTextColor() {
      const activeSection = getActiveSection();
      if (activeSection) {
        activeColor = activeSection.getAttribute("data-text-color") || defaultColor;
        activeBgColor = activeSection.getAttribute("data-bg-color") || defaultBgColor;
      } else {
        activeColor = defaultColor;
        activeBgColor = defaultBgColor;
      }

      responsiveTexts.forEach((textElement) => {
        textElement.style.color = activeColor;
        textElement.style.backgroundColor = activeBgColor;
        textElement.style.setProperty("--shadow-color", activeColor);
      });
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            activeColor = entry.target.getAttribute("data-text-color") || defaultColor;
            activeBgColor = entry.target.getAttribute("data-bg-color") || defaultBgColor;
          }
        });

        updateTextColor();
      },
      { threshold: 0.5 }
    );

    sections.forEach((section) => observer.observe(section));

    if (menu) {
      menu.addEventListener("transitionend", updateTextColor);
      menu.addEventListener("click", updateTextColor);
    }

    lineMaskLinks.forEach((link) => {
      const lines = link.querySelectorAll("[line-mask-text]");

      link.addEventListener("mouseenter", function () {
        gsap.to(lines, {
          yPercent: -100,
          duration: 0.2,
          ease: "ease",
          overwrite: true,
        });
      });

      link.addEventListener("mouseleave", function () {
        gsap.to(lines, {
          yPercent: 0,
          duration: 0.2,
          ease: "ease",
        });
      });
    });

    setTimeout(updateTextColor, 100);

    let scrollTimeout;
    window.addEventListener("scroll", () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(updateTextColor, 80);
    });
  }
});

/* =========================================
   Hover Slide Tooltip Logic
   ========================================= */
document.addEventListener("DOMContentLoaded", () => {
  {
    const triggerElements = document.querySelectorAll('[data-hover-slide-trigger]');

    triggerElements.forEach((trigger) => {
      const animatedElements = trigger.querySelectorAll('[data-animation="slideup"]');

      animatedElements.forEach((el) => {
        const mask = document.createElement("div");
        mask.classList.add("dynamic-mask");

        const span = document.createElement("span");
        span.innerHTML = el.innerHTML.trim();

        mask.appendChild(span);
        el.innerHTML = "";
        el.appendChild(mask);
      });

      trigger.addEventListener("mouseenter", () => {
        const masks = trigger.querySelectorAll(".dynamic-mask span");
        masks.forEach((span) => {
          const parent = span.closest('[data-animation="slideup"]');
          const delay = parseFloat(parent.getAttribute("slide-delay") || "0");
          const speed = parseFloat(parent.getAttribute("slide-speed") || "0.5");

          span.style.animation = "none";
          void span.offsetWidth;
          span.style.animation = `slideup ${speed}s ${delay}s cubic-bezier(0.785, 0.135, 0.15, 0.86) forwards`;
        });
      });

      trigger.addEventListener("mouseleave", () => {
        const masks = trigger.querySelectorAll(".dynamic-mask span");
        masks.forEach((span) => {
          span.style.animation = "none";
        });
      });
    });
  }
});

/* =========================================
   Disable Copy/Right-Click Logic
   ========================================= */
document.addEventListener("DOMContentLoaded", () => {
  document.body.addEventListener("contextmenu", (e) => {
    if (e.target.tagName === "IMG" || e.target.tagName === "SVG") {
      e.preventDefault();
    }
  });

  document.querySelectorAll("img, a, svg").forEach(el => {
    el.setAttribute("draggable", "false");
  });
});