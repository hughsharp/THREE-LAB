/**
 * scroll-pointsMorph.js
 * Handles scroll-based morphing for the Points system.
 */

export function initScrollMorph(pointsInstance) {
    let lastMorphTime = 0;
    const morphCooldown = 1500; // 1.5 seconds matching MORPH_DURATION

    // Manage Case-wise state
    // Step 0: Chaos
    // Step 1: Root (Index 1)
    // Step 2: Armature (Index 2)
    // Step 3: Animation 'standClap'
    // Step 4: Animation 'standToSit'
    let currentStep = 0;
    const MAX_STEPS = 4;

    // Enable by default on the instance
    if (pointsInstance.enableScrollMorph === undefined) {
        pointsInstance.enableScrollMorph = true;
    }

    // Select progress bars (Handles multiple if they exist)
    const progressLines = document.querySelectorAll(".progress_time-line");

    const updateProgressBar = (step) => {
        if (progressLines.length === 0) return;
        // User requested that step 4 reaches 20% of the progress
        // MAX_STEPS is 4. So (step / 4) * 20 gives us the range 0% to 20%.
        const percentage = (step / MAX_STEPS) * 20;
        progressLines.forEach(line => {
            line.style.height = `${percentage}%`;
        });
    };

    // Configuration for each scroll step
    // Defines the behavior for every state in the scroll sequence.
    // - label: Debug name.
    // - targetIndex: Morph target index in points.js (0: Chaos, 1: Root, 2: Armature).
    // - disableAttraction: If true, mouse attraction (suction) is disabled.
    // - scrollDuration: Time (ms) for the morph animation to complete.
    // - cooldown: Time (ms) to lock scrolling after entering this step.
    // - action: Optional function to trigger animations or other logic.
    const defaultScrollDuration = 1500;
    const fastScrollDuration = 200;
    const SCROLL_STEP_CONFIG = {
        0: {
            label: "Chaos",
            targetIndex: 0,
            disableAttraction: false,
            scrollDuration: defaultScrollDuration,
            cooldown: defaultScrollDuration,
            action: (points) => {
                points.stopAnimations(0.8);
            }
        },
        1: {
            label: "Root",
            targetIndex: 1,
            disableAttraction: false,
            scrollDuration: defaultScrollDuration,
            cooldown: defaultScrollDuration,
            action: (points) => {
                points.stopAnimations(0.8);
            }
        },
        2: {
            label: "Dance",
            targetIndex: 2,
            disableAttraction: false,
            scrollDuration: defaultScrollDuration,
            cooldown: defaultScrollDuration,
            action: (points) => {
                const possibleAnims = ['gangnam', 'robotDance'];
                const randomName = possibleAnims[Math.floor(Math.random() * possibleAnims.length)];
                points.playAnimation(randomName, 0.8, true);
            }
        },
        3: {
            label: "Wave",
            targetIndex: 2,
            disableAttraction: true,
            scrollDuration: fastScrollDuration,
            cooldown: fastScrollDuration,
            action: (points) => {
                console.log("[Scroll] Step 3: Triggering standClap (Looping)");
                points.playAnimation('waving', 0.5, true);
            }
        },
        4: {
            label: "Sit",
            targetIndex: 2,
            disableAttraction: true,
            scrollDuration: fastScrollDuration,
            cooldown: fastScrollDuration,
            action: (points) => {
                console.log("[Scroll] Step 4: Triggering standToSit (Play Once)");
                points.playAnimation('standToSit', 0.5, false);
            }
        }
    };

    const executeStep = (step) => {
        console.log(`Executing Scroll Step: ${step}`);
        updateProgressBar(step); // Sync UI

        const config = SCROLL_STEP_CONFIG[step];
        if (!config) return;

        const geo = pointsInstance.points.geometry;
        const currentMorphIdx = geo.morphCurrentIndex || 0;

        // 1. Apply Attraction Rule
        pointsInstance.forceDisableAttraction = config.disableAttraction;

        // 2. Handle Morphing
        if (config.targetIndex !== undefined) {
            if (currentMorphIdx !== config.targetIndex) {
                if (config.targetIndex === 2 && currentMorphIdx !== 2) {
                    console.log(`[Scroll] Step ${step}: Fast-morphing to Armature...`);
                }
                // Use configured scrollDuration or default
                pointsInstance.morphToTarget(config.targetIndex, config.scrollDuration || 1500);
            }
        }

        // 3. Execute Action (Animations etc)
        if (config.action) {
            config.action(pointsInstance);
        }
    };

    const handleWheel = (event) => {
        // 1. Check if feature is enabled
        if (!pointsInstance.enableScrollMorph) return;

        // 2. Check scene state
        const scene = pointsInstance.scene;
        if (!scene || scene.scenarioState !== 'points') return;

        // 3. Block default scrolling
        event.preventDefault();

        // 4. Throttle
        // Get cooldown from CURRENT step config (or default)
        const currentConfig = SCROLL_STEP_CONFIG[currentStep];
        const currentCooldown = currentConfig ? (currentConfig.cooldown || morphCooldown) : morphCooldown;

        const now = performance.now();
        if (now - lastMorphTime < currentCooldown) return;

        // 5. Detect Direction
        const delta = event.deltaY;
        if (Math.abs(delta) < 10) return;

        let nextStep = currentStep;
        if (delta > 0) {
            // Scroll Down -> Forward
            if (currentStep < MAX_STEPS) {
                nextStep = currentStep + 1;
            } else {
                return; // Already at end
            }
        } else {
            // Scroll Up -> Backward
            if (currentStep > 0) {
                nextStep = currentStep - 1;
            } else {
                return; // Already at start
            }
        }

        if (nextStep !== currentStep) {
            currentStep = nextStep;

            // Visual Feedback: Start Morph
            document.body.classList.add('morph-active');

            executeStep(currentStep);
            lastMorphTime = now;

            // Visual Feedback: End Morph after Cooldown
            // Use the cooldown of the target step ideally, or just the current. 
            // Let's use the cooldown we waited for.
            const nextConfig = SCROLL_STEP_CONFIG[nextStep];
            const nextCooldown = nextConfig ? (nextConfig.cooldown || morphCooldown) : morphCooldown;

            setTimeout(() => {
                document.body.classList.remove('morph-active');
            }, nextCooldown);
        }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
        window.removeEventListener('wheel', handleWheel);
    };
}
