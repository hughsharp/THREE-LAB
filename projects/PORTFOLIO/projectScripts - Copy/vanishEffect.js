import * as THREE from 'three';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';

/**
 * Manages the "disappear" and "reappear" animations for a set of objects.
 */
export class VanishEffect {
    /**
     * @param {THREE.Object3D} object3D The target object containing children to animate.
     */
    constructor(object3D) {
        this.object3D = object3D;
        this.isScaledDown = false; // Tracks if the objects are currently hidden.
        this.duration = 4000; // Shared duration
        
        object3D.vanishEffect = this
    }

    /**
     * Disappear: Scales objects to 0, spins them, and fades opacity.
     * Returns a Promise that resolves when animation completes.
     * @param {number} duration - Animation duration in ms.
     * @param {function} onComplete - Optional callback function.
     */
    scaleDown(duration = this.duration, onComplete = null) {
        return new Promise((resolve) => {
            
            // Internal helper to finish the promise and the callback
            const finish = () => {
                if (onComplete && typeof onComplete === 'function') onComplete();
                resolve();
            };

            if (!this.validateTarget()) {
                finish(); // Resolve immediately if invalid to prevent hanging
                return;
            }

            // 1. Animate Children (Scale & Rotation)
            Object.keys(this.object3D.tweenData).forEach(uuidKey => {
                const itemData = this.object3D.tweenData[uuidKey];
                const child = this.object3D.getObjectByProperty('uuid', itemData.uuid);
                if (!child) return;

                // Scale to 0
                new TWEEN.Tween(child.scale)
                    .to(new THREE.Vector3(0, 0, 0), duration)
                    .easing(TWEEN.Easing.Exponential.InOut)
                    .start();

                // Rotate: Add a spin effect
                new TWEEN.Tween(child.rotation)
                    .to({ y: child.rotation.y + Math.PI * 2 }, duration)
                    .easing(TWEEN.Easing.Exponential.InOut)
                    .start();
            });

            // 2. Handle Global State (Physics & Opacity) - Run this ONCE
            // We pass our 'finish' helper here
            this.handleGlobalEffects(0.0, duration, finish);

            this.isScaledDown = true;
        });
    }

    /**
     * Reappear: Restores objects to original scale and rotation.
     * Returns a Promise that resolves when animation completes.
     * @param {number} duration - Animation duration in ms.
     * @param {function} onComplete - Optional callback function.
     */
    scaleUp(duration = this.duration, onComplete = null) {
        return new Promise((resolve) => {

            const finish = () => {
                if (onComplete && typeof onComplete === 'function') onComplete();
                resolve();
            };

            if (!this.validateTarget()) {
                finish();
                return;
            }

            // 1. Animate Children (Scale & Rotation)
            Object.keys(this.object3D.tweenData).forEach(uuidKey => {
                const itemData = this.object3D.tweenData[uuidKey];
                const child = this.object3D.getObjectByProperty('uuid', itemData.uuid);
                if (!child) return;

                // Restore Scale
                new TWEEN.Tween(child.scale)
                    .to(itemData.scale, duration)
                    .easing(TWEEN.Easing.Exponential.InOut)
                    .start();

                // Restore Rotation
                new TWEEN.Tween(child.rotation)
                    .to({ y: itemData.rotation.y }, duration)
                    .easing(TWEEN.Easing.Exponential.InOut)
                    .start();
            });

            // 2. Handle Global State (Physics & Opacity)
            this.handleGlobalEffects(1.0, duration, finish);

            this.isScaledDown = false;
        });
    }

    /**
     * Toggles between scaleUp and scaleDown based on current state.
     * Returns a Promise.
     * @param {number} duration 
     * @param {function} onComplete 
     */
    toggleAnimations(duration = this.duration, onComplete = null) {
        if (this.isScaledDown) {
            return this.scaleUp(duration, onComplete);
        } else {
            return this.scaleDown(duration, onComplete);
        }
    }

    /**
     * Helper: Manages Physics pausing and Rain Opacity.
     * This prevents code duplication in scaleUp/scaleDown.
     * @param {number} targetOpacity - The opacity value to tween towards.
     * @param {number} duration
     * @param {function} onCompleteCallback - The internal callback to resolve the promise
     */
    handleGlobalEffects(targetOpacity, duration = this.duration, onCompleteCallback = null) {
        
        const opacityTween = new TWEEN.Tween(this.object3D.constantUniform.rainGlassOpacity)
            .to({ value: targetOpacity }, duration)
            .easing(TWEEN.Easing.Exponential.InOut)
            .onStart(() => {
                // Pause physics to prevent jitter during animation
                if (this.object3D.world) this.object3D.world.isPaused = true;
            })
            .onComplete(() => {
                // Resume physics when animation ends
                if (this.object3D.world) this.object3D.world.isPaused = false;

                // --- EXECUTE CALLBACK / RESOLVE PROMISE ---
                if (onCompleteCallback) {
                    onCompleteCallback();
                }
            })
            .start();
    }

    /**
     * Helper: Checks if object and data exist.
     */
    validateTarget() {
        if (!this.object3D || !this.object3D.tweenData) {
            console.error("AnimationManager: Target object or its 'tweenData' is not set.");
            return false;
        }
        return true;
    }
}