/**
 * DICH™ Navbar Logic
 * Handles menu interactions, hover effects, accessibility keybinds,
 * and the mouse coordinate display in the header.
 */

document.addEventListener("DOMContentLoaded", () => {
    initNavbarInteractions();
    initCoordinateTracker();
});

/**
 * 1. Navbar Menu Interactions
 * Handles opening/closing logic via custom triggers and hover effects for menu items.
 */
function initNavbarInteractions() {
    const elements = {
        navButton: document.querySelector(".nav_button"),
        closeTriggers: document.querySelectorAll("[nav-close-trigger]"),
        // Pairs of triggers and elements to toggle opacity on hover
        hoverPairs: [
            {
                trigger: document.querySelector("[anturax-nav-hover]"),
                from: document.querySelector(".nav_content-left"),
                to: document.querySelector(".nav_content-left-2"),
            },
            {
                trigger: document.querySelector("[oraniths-nav-hover]"),
                from: document.querySelector(".nav_content-right"),
                to: document.querySelector(".nav_content-right-2"),
            }
        ]
    };

    // Handle closing the menu when clicking specific triggers (like links)
    if (elements.navButton) {
        document.addEventListener("click", (e) => {
            if (e.target.closest("[nav-close-trigger]")) {
                elements.navButton.click();
            }
        });

        // Accessibility: Close menu on ESC key
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                // Check if any close trigger is currently visible implies menu is open
                const isMenuVisible = Array.from(elements.closeTriggers).some(
                    el => el.offsetParent !== null
                );
                
                if (isMenuVisible) {
                    elements.navButton.click();
                }
            }
        });
    }

    // Bind hover effects for menu images using GSAP
    elements.hoverPairs.forEach(({ trigger, from, to }) => {
        if (trigger && from && to) {
            bindOpacityToggle(trigger, from, to);
        }
    });
}

/**
 * Helper to toggle opacity between two elements using GSAP
 */
function bindOpacityToggle(trigger, from, to) {
    if (typeof gsap === 'undefined') {
        console.warn("GSAP is not loaded. Hover effects disabled.");
        return;
    }

    trigger.addEventListener("mouseenter", () => {
        gsap.set(from, { opacity: 0, overwrite: "auto" });
        gsap.set(to, { opacity: 1, overwrite: "auto" });
    });

    trigger.addEventListener("mouseleave", () => {
        gsap.set(from, { opacity: 1, overwrite: "auto" });
        gsap.set(to, { opacity: 0, overwrite: "auto" });
    });
}

/**
 * 2. Mouse Coordinate Tracker
 * Updates the X/Y coordinates in the navbar on desktop devices.
 */
function initCoordinateTracker() {
    // Disable on mobile/tablet
    if (window.innerWidth <= 768) return;

    const xCoord = document.getElementById("x-coordinate");
    const yCoord = document.getElementById("y-coordinate");

    if (!xCoord || !yCoord) return;

    let mouseX = 0;
    let mouseY = 0;
    let lastX = -1;
    let lastY = -1;
    let ticking = false;

    // Pad numbers with leading zeros (e.g., 0045)
    function formatNumber(num) {
        return num.toString().padStart(4, "0");
    }

    function updateCoordinates() {
        if (mouseX !== lastX || mouseY !== lastY) {
            // Use modulo 10000 to keep numbers within 4 digits
            xCoord.textContent = formatNumber(mouseX % 10000);
            yCoord.textContent = formatNumber(mouseY % 10000);
            lastX = mouseX;
            lastY = mouseY;
        }
        ticking = false;
    }

    document.addEventListener("mousemove", (event) => {
        mouseX = event.clientX;
        mouseY = event.clientY;

        if (!ticking) {
            ticking = true;
            requestAnimationFrame(updateCoordinates);
        }
    });
}