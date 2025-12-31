import * as THREE from 'three';

// --- CONSTANTS ---
const WHITE = new THREE.Color('#88B0FF');
const BLACK = new THREE.Color('black');
const MOON_COL = new THREE.Color('#b9d1ff');



/**
 * Manages the lightning strike simulation, updating uniforms and lights.
 * @param {object} dependencies - Object containing scene-specific dependencies.
 * @param {number} [ratio] - Ratio (0-1) to force a strike; if undefined, Math.random() is used.
 * @param {number} [normalizedStrikePosX=-2] - X position for the strike (-1 to 1) if manual. -2 if auto.
 * @param {boolean} [isLoopTrigger=false] - Internal flag to manage recursion/looping.
 */

// Returns 0.002 for x >= 0.4, and decays exponentially towards 0.0006 for x < 0.4.
function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

// export function monotonicallyDecreasing(x) {
//     const VALUE_FLOOR = 0.0006;
//     const CRITICAL_POINT = 0.4;
//     const START_VALUE = 0.002;
//     const DECAY_RATE_K = 5.0;

//     if (x >= CRITICAL_POINT) {
//         return START_VALUE;
//     }

//     const DECAY_RANGE = START_VALUE - VALUE_FLOOR;
//     const distance = CRITICAL_POINT - x;
//     const decayFactor = Math.exp(-DECAY_RATE_K * distance);

//     return VALUE_FLOOR + DECAY_RANGE * decayFactor;
// }


// Variable to store the interval ID (module scope)
let lightningInterval = null;

export function lightningStrike(dependencies, ratio, normalizedStrikePos = undefined, isLoopTrigger = true) {
    const { scene, constantUniform, windowLight } = dependencies;

    // --- Loop Logic ---
    // We handle the loop setup at the very beginning.
    if (isLoopTrigger) {
        // 1. Clear any existing interval to prevent duplicates
        if (lightningInterval) clearInterval(lightningInterval);

        // 2. Set the new Interval
        // We use 250ms (average of your old 0-500ms random delay)
        lightningInterval = setInterval(() => {
            // CRITICAL: We call the function again with a NEW random ratio.
            // We pass 'false' for isLoopTrigger so this inner call doesn't create another interval.
            lightningStrike(dependencies, Math.random(), undefined, false);
        }, 3000);
    }

    // --- Safety Check ---
    if (!constantUniform || !windowLight) return;

    // --- Strike Logic (Unchanged) ---
    if (ratio > 0.6) {
        if (!constantUniform.enableLightning.value) return;

        if (ratio < 1) {
            // Ensure vector exists
            if (!normalizedStrikePos) normalizedStrikePos = new THREE.Vector2();

            normalizedStrikePos.x = getRandomFloat(0.045, 0.5);
            normalizedStrikePos.y = getRandomFloat(-0.9, 0.55);
        } else if (!normalizedStrikePos) {
            // Fallback if ratio >= 1 but no pos provided (manual trigger edge case)
            normalizedStrikePos = new THREE.Vector2(0, 0);
        }

        // CALCULATE STRENGTH BASED ON Y HEIGHT
        // Y range: -0.9 (Low/Strong) to 0.55 (High/Weak)
        // Map Y to 0.0 - 1.0 (inverted)
        const minY = -0.9;
        const maxY = 0.55;
        const clampedY = Math.max(minY, Math.min(maxY, normalizedStrikePos.y));
        const strength = 1.0 - ((clampedY - minY) / (maxY - minY)); // 1.0 at -0.9, 0.0 at 0.55

        constantUniform.isStriking.value = true;
        windowLight.visible = true;
        constantUniform.normalizedStrikePos.value = normalizedStrikePos;

        // Apply Strength to Light Properties
        // Stronger = Higher Intensity, Higher Distance, Lower Decay
        windowLight.intensity = 10000000 * (0.5 + 2.5 * (1 + strength) * (1 + strength)); // Range: 5M to 20M
        windowLight.distance = 40 + (150 - 36.6) * strength;     // Range: 36.6 to 150
        windowLight.decay = 2.4 - (0.6 * strength);                // Range: 2.4 (Weak) to 1.8 (Strong)

        // Duration also linked to strength (Stronger = Longer flash?)
        // Or User said "smaller y stronger effect", maybe keep random duration or bias it?
        // Let's bias it: Stronger = slightly longer
        const duration = 100 + (400 * strength);

        // Auto-OFF
        setTimeout(() => {
            constantUniform.isStriking.value = false;
            windowLight.visible = false;
        }, duration);

    }

    // REMOVED: The old recursive setTimeout block is gone.
}
// --- LIGHT SETUP FUNCTION ---
export function addLights(scene, constantUniform) {

    const windowLight = createSpotLight(scene)

    // 1. Package all dependencies used by strike()
    const strikeDependencies = {
        scene: scene,
        constantUniform: constantUniform,
        windowLight: windowLight
    };

    // 2. Start the loop via the external function
    lightningStrike(strikeDependencies, Math.random());
    console.log('STRIKE')
    return windowLight;
}


function createSpotLight(scene) {
    const windowLight = new THREE.SpotLight();
    windowLight.angle = 2;

    windowLight.color = MOON_COL;
    windowLight.name = "windowLight";

    windowLight.position.set(0.00, 5.00, 40.00);
    windowLight.visible = false;
    scene.add(windowLight);
    scene.windowLight = windowLight;

    windowLight.castShadow = false

    windowLight.color = WHITE; // Make sure WHITE is defined or use new THREE.Color(0xffffff)
    windowLight.intensity = 10000000;


    return windowLight;
}

function createDirectionalLight(scene) {
    const windowLight = new THREE.createDirectionalLight();
    windowLight.angle = 2;
    windowLight.intensity = 1500;
    windowLight.color = MOON_COL;
    windowLight.name = "windowLight";
    windowLight.distance = 0;
    windowLight.position.set(0.00, 5.00, 40.00);
    windowLight.visible = false;
    scene.add(windowLight);
    scene.windowLight = windowLight;

    return windowLight;
}