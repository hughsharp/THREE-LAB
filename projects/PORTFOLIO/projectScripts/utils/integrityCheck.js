import * as THREE from 'three';
import RAPIER from '../rapierPhysics/rapier3d-compat.js';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';
import { playOneShotAnimation } from './animationManager.js';
import { updateStory } from './status.js';

const CHECK_INTERVAL = 3000;
const POSITION_THRESHOLD = 2.0;
const ROTATION_THRESHOLD = 0.25;

/**
 * Captures the initial 'correct' position and rotation of all physics bodies
 * to serve as a baseline for future integrity checks.
 * Should be called once after the scene is fully settled.
 */
export function setupIntegrityBaseline(scene) {
    if (!scene.physicBodies || scene.physicBodies.length === 0) {
        console.warn("Integrity Check: No bodies found in scene.physicBodies");
        return;
    }

    // GUARD: Do not capture baseline if chaos is active (Black Hole / Point Gravity)
    if (scene.world.hasPointGravityOnBH) {
        console.warn("Integrity Check: Skipped baseline capture due to active Point Gravity.");
        return;
    }

    let count = 0;
    // Give physics a moment to settle or verify if this is called after physics init
    // Assuming this is called when objects are in their "correct" state
    scene.physicBodies.forEach(body => {
        // Capture baseline if it's EITHER a check target OR a reset target
        if (!body.isIntegrityCheckTarget && !body.isIntegrityResetTarget) return;

        // PRIORITY: Use userData original transforms if available (Design State)
        // Fallback: Use current physics state (Settled State)
        let pos, rot;

        if (body.threeObject && body.threeObject.userData && body.threeObject.userData.originalPos) {
            // Use Stored Design State
            const op = body.threeObject.userData.originalPos;
            const or = body.threeObject.userData.originalRot;

            // Set Position
            pos = new THREE.Vector3(op.x, op.y, op.z);

            // Set Rotation
            if (or && or.isEuler) {
                // Convert Euler to Quaternion
                rot = new THREE.Quaternion().setFromEuler(or);
            } else if (body.threeObject.userData.originalQuaternion) {
                const oq = body.threeObject.userData.originalQuaternion;
                rot = new THREE.Quaternion(oq.x, oq.y, oq.z, oq.w);
            } else {
                // Fallback to current rotation if only Euler is stored (to avoid Gimbal lock issues in conversion if not sure)
                const r = body.rotation();
                rot = new THREE.Quaternion(r.x, r.y, r.z, r.w);
            }

        } else {
            // Fallback: Capture current state
            const t = body.translation();
            const r = body.rotation();
            pos = new THREE.Vector3(t.x, t.y, t.z);
            rot = new THREE.Quaternion(r.x, r.y, r.z, r.w);
        }

        // Store baseline in a custom property on the body
        body.integrity = {
            position: pos,
            quaternion: rot
        };
        count++;
        // console.log(body)
    });
    console.log(`Integrity Check: Baseline captured for ${count} bodies.`);
    scene.allowsResetting = true;

    Object.defineProperty(scene, 'integrityBaselineCaptured', {
        value: true,
        writable: false, // Read-only
        configurable: false // Cannot be deleted or redefined
    });
}

/**
 * Resets a single physics body to its baseline integrity state.
 * Uses a tween to smoothly move the object back.
 * ACTIVATES GHOST MODE (Sensor=true) to prevent collisions during return.
 * @param {THREE.Scene} scene - The main scene (for global flags).
 * @param {RAPIER.RigidBody} body - The body to reset.
 * @param {number} duration - Duration of the reset animation in ms.
 */
function resetBodyToIntegrity(scene, body, duration = 2000) {
    if (body.isResetting) return;
    body.isResetting = true;

    // --- Definitions ---
    if (!body.integrity) {
        console.warn(`[Integrity Check] Missing baseline for ${body.threeObject?.name}`);
        body.isResetting = false;
        return;
    }
    const targetPos = body.integrity.position.clone();
    targetPos.y += 0.05; // Lift slightly
    const targetQuat = body.integrity.quaternion;
    const originalBodyType = body.bodyType();
    // -------------------

    // Void forces before switching to Kinematic/Resetting
    // body.setLinvel({ x: 0, y: 0, z: 0 }, true);
    // body.setAngvel({ x: 0, y: 0, z: 0 }, true);

    // STEP 1: POP-UP IMPULSE
    // Apply a random upward force to simulate "levitation start"
    // Keep X/Z 0 to avoid shooting sideways
    const mass = body.mass();
    const impulseStrength = (Math.random() * 3.0) * mass; // Random pop strength scaled by mass
    body.applyImpulse({ x: 0, y: impulseStrength, z: 0 }, true);
    body.wakeUp();

    // STEP 2: WAIT THEN TWEEN
    setTimeout(() => {
        // Now switch to Ghost Mode and Tween back

        // Capture POST-POP state if needed, or just use current
        const startTrans = body.translation();
        const startRot = body.rotation();

        const startPos = new THREE.Vector3(startTrans.x, startTrans.y, startTrans.z);
        const startQuat = new THREE.Quaternion(startRot.x, startRot.y, startRot.z, startRot.w);

        // GHOST MODE: Disable Collisions
        if (body.rapierCollider) {
            body.rapierCollider.setSensor(true);
        }

        // Switch to Kinematic for controlled movement
        body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased);

        const progress = { val: 0 };
        new TWEEN.Tween(progress)
            .to({ val: 1 }, duration)
            .easing(TWEEN.Easing.Back.InOut)
            .onUpdate(() => {
                // Lerp Position
                const p = new THREE.Vector3().lerpVectors(startPos, targetPos, progress.val);
                body.setNextKinematicTranslation(p);

                // Slerp Rotation
                const q = startQuat.clone().slerp(targetQuat, progress.val);
                body.setNextKinematicRotation(q);
            })
            .onComplete(() => {

                // Restore Physics State
                // FIRST: Set Position Explicitly to avoid drift
                body.setNextKinematicTranslation(targetPos);
                body.setNextKinematicRotation(targetQuat);

                // Kill Momentum BEFORE switching (void forces first)
                if (originalBodyType === RAPIER.RigidBodyType.Dynamic) {
                    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
                }

                // Restore Body Type
                body.setBodyType(originalBodyType);

                // SOLIDIFY: Enable Collisions
                if (body.rapierCollider) {
                    body.rapierCollider.setSensor(false);
                }

                body.wakeUp();
                body.isResetting = false;
            })
            .start();

    }, 1000); // End of Wait-Then-Tween
}

/**
 * Starts the periodic integrity check loop.
 * Detects misplaced objects (distance/rotation threshold).
 * If mess is found: Updates Story -> Plays 'Bang Desk' -> Resets ALL objects via Ghost Mode.
 */
export function startIntegrityCheck(scene) {
    console.log("Integrity check started.");

    // Guard: ensure mixer available
    // (AnimationManager handles missing mixer gracefully but acts as a fallback)

    let checkTimer;

    const scheduleNextCheck = () => {
        clearTimeout(checkTimer);
        checkTimer = setTimeout(runIntegrityCheck, CHECK_INTERVAL);
    };

    const runIntegrityCheck = () => {
        if (!scene.physicBodies || scene.physicBodies.length === 0) {
            scheduleNextCheck();
            return;
        }
        if (!scene.allowsResetting) {
            scheduleNextCheck();
            return;
        }

        // GUARD: Pause checks if Chaos (Point Gravity) is active
        if (scene.world?.hasPointGravityOnBH) {
            // Just skip this cycle, don't reset timer, just wait for interval
            scheduleNextCheck();
            return;
        }

        let misplacedBodies = [];

        scene.physicBodies.forEach(body => {
            // DETECT MESS: Only monitor Check Targets
            if (!body.isIntegrityCheckTarget) return;
            if (!body.integrity) return;
            if (body.isResetting) return; // Skip if already processing

            const threeObject = body.threeObject;
            const name = threeObject ? threeObject.name : "Unknown Body";

            const currentTrans = body.translation();
            const currentRot = body.rotation();
            const currentPos = new THREE.Vector3(currentTrans.x, currentTrans.y, currentTrans.z);
            const currentQuat = new THREE.Quaternion(currentRot.x, currentRot.y, currentRot.z, currentRot.w);

            const originalPos = body.integrity.position;
            const distance = currentPos.distanceTo(originalPos);

            let needsReset = false;

            if (distance > POSITION_THRESHOLD) {
                console.warn(`[Integrity Check] Body "${name}" is misplaced by ${distance.toFixed(2)} units!`);
                needsReset = true;
            } else {
                const originalQuat = body.integrity.quaternion;
                const angle = currentQuat.angleTo(originalQuat);

                if (angle > ROTATION_THRESHOLD) {
                    console.warn(`[Integrity Check] Body "${name}" is rotated by ${(angle * (180 / Math.PI)).toFixed(2)} degrees!`);
                    needsReset = true;
                }
            }

            if (needsReset) {
                misplacedBodies.push(body);
            }
        });

        // --- ANIMATION INTERACTION ---
        if (misplacedBodies.length > 0) {
            scene.allowsResetting = false; // Flag start of sequence

            console.log(`[Integrity Check] Found ${misplacedBodies.length} misplaced items. Name: ${misplacedBodies[0].threeObject.name}`);

            // Dramatic Story Update
            if (misplacedBodies.length < 3) {
                updateStory("Who touched my stuff?!");
            } else {
                updateStory("THIS PLACE IS A MESS!");
            }

            // Calculate Speed: Rational Interpolation
            // 1 object -> 1.0x
            // 5 objects -> 3.0x (+0.5 per extra object)
            // Clamped at 3.0
            let angerSpeed = Math.min(1 + (misplacedBodies.length - 1) * 0.5, 4.0);

            // 1 object -> 500ms (Quick snap)
            // 5 objects -> 2000ms
            let resetDuration = Math.min(800 + (misplacedBodies.length * 200), 2000);

            // Play Animation first
            const animInfo = playOneShotAnimation(scene, "bangingFist", {
                speed: angerSpeed,
                randomize: false, // We want deterministic anger
                onComplete: () => {
                    // Animation Finished: Just cleanup flags
                    // Clear flag after reset completes + Buffer
                    const totalWait = Math.max(0, resetDuration - (animInfo.duration * 0.2 * 1000));

                    setTimeout(() => {
                        scene.allowsResetting = true;
                        // Restart cycle after reset is fully done
                        scheduleNextCheck();
                        console.log("[Integrity Check] Global reset sequence complete.");
                    }, totalWait + 100);
                }
            });

            // TRIGGER RESET at 40% of Animation
            if (animInfo && animInfo.duration) {
                const triggerTime = (animInfo.duration * 1000) * 0.4;
                console.log(`[Integrity Check] Reset triggering in ${triggerTime.toFixed(0)}ms (40% of anim)`);

                setTimeout(() => {
                    // Reset ALL valid items (Plan 1)
                    console.log(`[Integrity Check] Impact! Resetting items now.`);
                    updateStory("Restoring Order (Strict)...");

                    scene.physicBodies.forEach(body => {
                        // RESTORE ORDER: Reset All Reset Targets (if baseline exists)
                        if (body.isIntegrityResetTarget && body.integrity) {
                            resetBodyToIntegrity(scene, body, resetDuration);
                        }
                    });
                }, triggerTime);
            }
        } else {
            // No mess found, just schedule next check
            scheduleNextCheck();
        }
    };

    // User Interaction Reset
    // Whenever user clicks in DOM, reset the countdown
    window.addEventListener('pointerdown', () => {
        // console.log("User active: Resetting Integrity Timer");
        scheduleNextCheck();
    });

    // Start the loop
    scheduleNextCheck();
}
