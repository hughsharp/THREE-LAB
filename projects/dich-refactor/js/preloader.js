/**
 * DICH™ Preloader Logic
 * Handles the initial load animation, number counter, and exit transition.
 * Dependencies: GSAP, ScrollTrigger (optional), CSS for .preloader-enter
 */

document.addEventListener("DOMContentLoaded", () => {
    // 1. Session Storage Check (Don't show preloader on refresh/tab switch if already seen)
    const PRELOADER_STORAGE_KEY = "preloaderHidden";
    const preloaderElement = document.querySelector(".preloader-enter");
    
    // Helper to check if session storage works (e.g., not blocked by browser settings)
    const isSessionStorageAvailable = () => {
        try {
            sessionStorage.setItem("test", "test");
            sessionStorage.removeItem("test");
            return true;
        } catch (e) {
            return false;
        }
    };

    // If preloader element doesn't exist, stop here
    if (!preloaderElement) return;

    // Check if we should hide it immediately
    if (isSessionStorageAvailable() && sessionStorage.getItem(PRELOADER_STORAGE_KEY) === "true") {
        preloaderElement.remove();
        // Ensure scroll is unlocked if lenis or body style was locked
        document.body.style.overflow = "auto";
        return; 
    }

    // 2. Variable Definitions
    const preloaderBlack = document.querySelector('.preloader-black');
    const lines = document.querySelectorAll('.preloader_line');
    const blocks = document.querySelectorAll('.is-top-1, .is-top-2, .is-top-3, .is-center-1, .is-center-2-1, .is-center-2-2, .is-center-3, .is-bottom-1, .is-bottom-2, .is-bottom-3');
    const corners = document.querySelector('.preloader_corners');
    const textGroup = document.querySelector('.preloader_text');
    const enterButtonWrap = document.querySelector('.preloader_button-wrap');
    const enterButtonTrigger = document.querySelector('[data-enter-hide]'); 
    const circleButton = document.querySelector('.button-circle-preloader');
    const lottiePreloader = document.querySelector('.lottie_preloader');

    // 3. Initial Animation (Fade out black overlay, animate lines in)
    if (preloaderBlack) {
        gsap.to(preloaderBlack, {
            opacity: 0,
            duration: 0.25,
            onComplete: () => {
                preloaderBlack.style.display = "none";
            }
        });
    }

    // Animate Lines Expanding
    lines.forEach(line => {
        const isTop = line.classList.contains('is-top');
        const isBottom = line.classList.contains('is-bottom');
        const isLeft = line.classList.contains('is-left');
        const isRight = line.classList.contains('is-right');

        if (isTop || isBottom) {
            gsap.fromTo(line,
                { width: 0 },
                { width: '100%', duration: 1.25, delay: 1, ease: 'power2.inOut' }
            );
        } else if (isLeft || isRight) {
            gsap.fromTo(line,
                { height: 0 },
                { height: '100%', duration: 1.25, delay: 1, ease: 'power2.inOut' }
            );
        }
    });

    // Show the "Enter" button after a delay
    if (circleButton) {
        gsap.delayedCall(5.25, () => {
            circleButton.classList.add('is-active');
        });
    }

    // 4. Number Counter Animation (0 to 100)
    const counterElements = document.querySelectorAll('[counter-element="number"]');
    
    const cubicBezier = (t, p0, p1, p2, p3) => {
        const u = 1 - t;
        return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
    };
    
    const animateNumber = (element, target, duration, callback) => {
        let startTime;
        const initialNumber = 0;
        // Ease Out Expo-ish
        const easingFunction = t => cubicBezier(t, 0, 0.645, 0.355, 1);

        const animate = time => {
            if (!startTime) startTime = time;
            const elapsedTime = time - startTime;
            const t = Math.min(elapsedTime / duration, 1);
            const easedT = easingFunction(t);
            const newValue = initialNumber + (target - initialNumber) * easedT;
            const roundedValue = Math.floor(newValue);

            if (parseInt(element.textContent, 10) !== roundedValue) {
                element.textContent = roundedValue;
            }

            if (elapsedTime < duration) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = target;
                if (callback) callback();
            }
        };
        requestAnimationFrame(animate);
    };

    // Trigger counter when visible
    const onCounterIntersection = (entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const finalNumber = parseInt(el.textContent, 10) || 100; // Default to 100 if empty
                const animDuration = 3250;

                el.textContent = "0";

                // Add small delay before counting
                setTimeout(() => {
                    animateNumber(el, finalNumber, animDuration, () => {
                        // After count finishes, slide text up
                        setTimeout(() => {
                            document.querySelectorAll(".preloader_load-text-big, .preloader_load-text-small").forEach(text => {
                                text.style.transform = "translateY(100%)";
                                text.style.opacity = "0";
                            });
                        }, 250);
                    });
                }, 250);

                observer.unobserve(el);
            }
        });
    };

    const counterObserver = new IntersectionObserver(onCounterIntersection);
    counterElements.forEach(el => counterObserver.observe(el));


    // 5. Exit Animation (Clicking "Enter")
    if (enterButtonTrigger) {
        enterButtonTrigger.addEventListener("click", (e) => {
            e.preventDefault(); // Prevent default anchor jump if any
            
            // Set session storage so it doesn't show again
            if (isSessionStorageAvailable()) {
                sessionStorage.setItem(PRELOADER_STORAGE_KEY, "true");
            }

            const tl = gsap.timeline();

            // Fade out button and lottie
            if (circleButton && lottiePreloader) {
                tl.to([circleButton, lottiePreloader], {
                    scale: 0,
                    opacity: 0,
                    duration: 0.25,
                    ease: "power2.inOut"
                }, 0);
            }

            // Fade out lines
            tl.to(lines, {
                opacity: 0,
                duration: 0.5,
                ease: "power2.out"
            }, 0.25);

            // Collapse blocks (The "Shutters" effect)
            blocks.forEach(block => {
                let props = {};
                // Determine which direction to collapse based on class
                if (block.classList.contains('is-top-1') || block.classList.contains('is-bottom-3')) {
                    props = { height: 0 };
                } else if (block.classList.contains('is-top-2') || block.classList.contains('is-center-3') || block.classList.contains('is-center-2-2')) {
                    props = { width: 0 };
                } else if (block.classList.contains('is-top-3') || block.classList.contains('is-bottom-1')) {
                    props = { height: 0 };
                } else if (block.classList.contains('is-center-1') || block.classList.contains('is-bottom-2') || block.classList.contains('is-center-2-1')) {
                    props = { width: 0 };
                }
                
                tl.to(block, { ...props, duration: 1, ease: "power2.inOut" }, 0.25);
            });

            // Fade out corners and text
            tl.to([corners, textGroup], {
                opacity: 0,
                duration: 0.1,
                ease: "power1.out"
            }, 0.25);

            // Final removal
            tl.to(preloaderElement, {
                opacity: 0,
                duration: 0.2,
                ease: "power1.out",
                onComplete: () => {
                    preloaderElement.remove();
                    // Optional: Trigger any other start-up animations here
                    window.dispatchEvent(new Event('preloaderComplete'));
                }
            }, "+=1.5");
        });
    }
});