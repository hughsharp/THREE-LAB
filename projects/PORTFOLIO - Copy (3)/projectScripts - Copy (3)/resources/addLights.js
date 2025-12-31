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
        }, 250);
    }

    // --- Safety Check ---
    if (!constantUniform || !windowLight) return;

    // --- Strike Logic (Unchanged) ---
    if (ratio > 0.95) {
        if (!constantUniform.enableLightning.value) return;

        if (ratio < 1) {
            normalizedStrikePos = new THREE.Vector2(
                getRandomFloat(0.045, 0.5),
                getRandomFloat(-0.9, 0.55)
            );
        }

        constantUniform.isStriking.value = true;
        windowLight.color = WHITE; // Make sure WHITE is defined or use new THREE.Color(0xffffff)
        windowLight.intensity = 10000000;
        windowLight.distance = 0;
        windowLight.visible = true;
        constantUniform.normalizedStrikePos.value = normalizedStrikePos;

    } else {
        constantUniform.isStriking.value = false;
        windowLight.color = MOON_COL; // Make sure MOON_COL is defined
        windowLight.visible = false;
        windowLight.intensity = 1500;
        scene.background = BLACK; // Make sure BLACK is defined
    }

    // REMOVED: The old recursive setTimeout block is gone.
}
// --- LIGHT SETUP FUNCTION ---
export function addLights(scene, constantUniform) {

    const windowLight = new THREE.SpotLight();

    windowLight.angle = 2;
    windowLight.intensity = 1500;
    windowLight.color = MOON_COL;
    windowLight.name = "windowLight";
    windowLight.distance = 0;
    windowLight.position.set(0.00, 5.00, 40.00);
    scene.add(windowLight);
    scene.windowLight = windowLight;

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