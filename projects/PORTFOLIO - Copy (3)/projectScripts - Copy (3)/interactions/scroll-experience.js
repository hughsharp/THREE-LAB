document.addEventListener("DOMContentLoaded", () => {
    
    /* =========================================
       1. VARIABLES & CACHING
       ========================================= */
    const bgLayer = document.querySelector(".change-bg");
    
    // Select ALL sections for visibility toggling
    const sections = document.querySelectorAll(".placeholder-section");
    const progressLines = document.querySelectorAll(".progress_time-line");
    
    let cachedScrollHeight = 0;
    let cachedClientHeight = 0;

    // Set to track visible sections for 3D quality optimization
    const visibleSections = new Set();

    function updatePageMetrics() {
        cachedScrollHeight = document.documentElement.scrollHeight;
        cachedClientHeight = document.documentElement.clientHeight;
    }

    updatePageMetrics();
    window.addEventListener("resize", updatePageMetrics);


    /* =========================================
       2. VISIBILITY & 3D QUALITY TOGGLER
       (This was missing from your code!)
       ========================================= */
    if (sections.length > 0) {
        const visibilityObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    // SHOW CONTENT: Adds the class that sets visibility: visible
                    entry.target.classList.add('is-visible');
                    visibleSections.add(entry.target);
                } else {
                    // HIDE CONTENT: Saves GPU
                    entry.target.classList.remove('is-visible');
                    visibleSections.delete(entry.target);
                }
            });

            // OPTIMIZATION: If ANY text is visible, lower 3D quality to save FPS
            if (window.setLowQualityMode) {
                const shouldBeLowQuality = visibleSections.size > 0;
                window.setLowQualityMode(shouldBeLowQuality);
            }

        }, {
            threshold: 0.1,      // Trigger as soon as 10% is on screen
            rootMargin: "50px"   // Pre-load slightly before it hits the viewport
        });

        sections.forEach((section) => {
            visibilityObserver.observe(section);
        });
    }


    /* =========================================
       3. BACKGROUND COLOR LOGIC
       ========================================= */
    if (bgLayer && sections.length > 0) {
        const colorObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const newColor = entry.target.getAttribute("section-bg");
                    if (newColor) {
                        bgLayer.style.backgroundColor = newColor;
                    }
                }
            });
        }, {
            threshold: 0.5
        });

        sections.forEach((section) => {
            colorObserver.observe(section);
        });
    }


    /* =========================================
       4. OPTIMIZED SCROLL LOOP (Progress Bar)
       ========================================= */
    if (progressLines.length > 0) {
        function onScroll() {
            const scrollTop = window.scrollY;
            const maxScroll = cachedScrollHeight - cachedClientHeight;
            
            if (maxScroll <= 0) return;

            const scrollPercent = Math.min((scrollTop / maxScroll) * 100, 100);

            requestAnimationFrame(() => {
                progressLines.forEach(line => {
                    line.style.height = `${scrollPercent}%`;
                });
            });
        }

        window.addEventListener("scroll", onScroll, { passive: true });
    }
});