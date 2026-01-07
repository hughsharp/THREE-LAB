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

    const executeStep = (step) => {
        console.log(`Executing Scroll Step: ${step}`);
        updateProgressBar(step); // Sync UI

        const geo = pointsInstance.points.geometry;
        const currentMorphIdx = geo.morphCurrentIndex || 0;

        switch (step) {
            case 0:
                if (currentMorphIdx !== 0) pointsInstance.morphToTarget(0); // Chaos
                pointsInstance.stopAnimations(0.8);
                break;
            case 1:
                if (currentMorphIdx !== 1) pointsInstance.morphToTarget(1); // Root
                pointsInstance.stopAnimations(0.8);
                break;
            case 2:
                if (currentMorphIdx !== 2) pointsInstance.morphToTarget(2); // Armature
                // Play a random dance animation
                const possibleAnims = ['gangnam', 'robotDance', 'waving'];
                const randomName = possibleAnims[Math.floor(Math.random() * possibleAnims.length)];
                pointsInstance.playAnimation(randomName, 0.8, true);
                break;
            case 3:
                // Already at index 2 (usually), just play animation
                if (currentMorphIdx !== 2) {
                    console.log("[Scroll] Step 3: Fast-morphing to Armature for animation...");
                    pointsInstance.morphToTarget(2);
                }
                console.log("[Scroll] Step 3: Triggering standClap (Looping)");
                pointsInstance.playAnimation('bangingFist', 0.5, true);
                break;
            case 4:
                // Already at index 2, just play animation
                if (currentMorphIdx !== 2) {
                    console.log("[Scroll] Step 4: Fast-morphing to Armature for animation...");
                    pointsInstance.morphToTarget(2);
                }
                console.log("[Scroll] Step 4: Triggering standToSit (Play Once)");
                pointsInstance.playAnimation('standToSit', 0.5, false); // Play once
                break;
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
        const now = performance.now();
        if (now - lastMorphTime < morphCooldown) return;

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
            setTimeout(() => {
                document.body.classList.remove('morph-active');
            }, morphCooldown);
        }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
        window.removeEventListener('wheel', handleWheel);
    };
}
