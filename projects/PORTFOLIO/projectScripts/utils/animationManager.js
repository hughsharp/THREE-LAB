
import * as THREE from 'three';
import { updateStory } from '../utils/status.js';

/**
 * Plays a one-shot animation with optional organic variations.
 * @param {THREE.Scene} scene - The scene containing the mixer.
 * @param {string} clipName - The animation clip name.
 * @param {object} [options={}] - Configuration options.
 * @param {string} [options.idleClipName='typing'] - Clip to return to.
 * @param {number} [options.crossFadeDuration=0.5] - Transition time.
 * @param {boolean} [options.randomize=false] - Enable organic variations.
 */
export function playOneShotAnimation(scene, clipName, options = {}) {
    // defaults
    const {
        idleClipName = 'typing',
        crossFadeDuration = 0.5,
        randomize = false,
        speed = 1.0,        // NEW: Explicit speed control
        onComplete = null   // NEW: Callback when animation finishes
    } = options;

    if (!scene.mixer || !scene.heroClips) {
        console.warn("Animation Manager: Mixer or heroClips not found on scene.");
        return;
    }

    const clip = scene.heroClips.find(c => c.name === clipName);
    if (!clip) {
        console.warn(`Animation Manager: Clip "${clipName}" not found.`);
        return;
    }

    const newAction = scene.mixer.clipAction(clip);

    // GUARD: Debounce
    if (scene.activeAction === newAction && newAction.isRunning()) {
        console.log(`Animation Manager: "${clipName}" is already playing.Ignoring request.`);
        return;
    }

    newAction.reset();

    // --- VARIATION LOGIC ---
    let actualDuration = clip.duration;
    let timeScale = 1.0;

    if (randomize) {
        // 1. Speed Jitter (Energy Level): 0.8x to 2.0x
        timeScale = 0.8 + Math.random() * 1.2;
        newAction.timeScale = timeScale;

        // 2. Lazy Weight (Effort): 0.8 to 1.0 (unchanged)
        // Sometimes he doesn't fully commit to the pose, letting idle bleed in.
        newAction.setEffectiveWeight(0.8 + Math.random() * 0.2);

        // 3. Early Exit (Dismissal)
        // Only apply 50% of the time to avoid cutting off too often
        if (Math.random() > 0.5) {
            // Cut off between 60% and 80% of the clip
            const cutOffPct = 0.6 + Math.random() * 0.2;
            actualDuration = clip.duration * cutOffPct;
        }

        // 4. Apex Pause REMOVED per user request
    } else {
        newAction.timeScale = speed; // Apply explicit speed if randomization is off (or overridden)
        newAction.setEffectiveWeight(1.0);
        timeScale = speed;
    }

    // Loop Logic
    if (clipName === idleClipName) {
        newAction.setLoop(THREE.LoopRepeat);
        newAction.clampWhenFinished = false;
    } else {
        newAction.setLoop(THREE.LoopOnce);
        newAction.clampWhenFinished = true;
    }

    newAction.play();

    // Crossfade
    if (scene.activeAction && scene.activeAction !== newAction) {
        scene.activeAction.crossFadeTo(newAction, crossFadeDuration);
    }
    scene.activeAction = newAction;

    // Return to Idle Logic
    if (clipName !== idleClipName) {
        // We use setTimeout for Early Exit logic instead of 'finished' event if randomized
        // But 'finished' is safer for full clips.
        // Hybrid Approach: Use 'finished' normally, but force a transition if 'actualDuration' is shorter.

        let hasReturned = false;

        const returnToIdle = () => {
            if (hasReturned) return;
            hasReturned = true;

            const idleClip = scene.heroClips.find(c => c.name === idleClipName);
            if (idleClip) {
                const idleAction = scene.mixer.clipAction(idleClip);
                idleAction.reset();
                idleAction.setLoop(THREE.LoopRepeat);
                idleAction.play();

                // If we paused/early exited, we need to smooth over it
                newAction.crossFadeTo(idleAction, crossFadeDuration);
                scene.activeAction = idleAction;

                if (updateStory) updateStory("Returning to idle...");

                // Trigger User Callback
                if (onComplete) onComplete();
            }
        };

        if (randomize && actualDuration < clip.duration) {
            // Early Exit Timer
            // Adjust for TimeScale!
            const exitTimeMs = (actualDuration / timeScale) * 1000;
            setTimeout(returnToIdle, exitTimeMs);
        } else {
            // Standard Finish Event
            const onFinished = (e) => {
                if (e.action === newAction) {
                    scene.mixer.removeEventListener('finished', onFinished);
                    returnToIdle();
                }
            };
            scene.mixer.addEventListener('finished', onFinished);
        }
    }
    // Return useful info for timing
    // Effective Duration = (Clip Duration in seconds) / (TimeScale)
    const effectiveDuration = actualDuration / timeScale;

    return {
        action: newAction,
        duration: effectiveDuration
    };
}

