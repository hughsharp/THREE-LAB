import * as THREE from 'three';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';
import RAPIER from '../rapier3d-compat.js';
import { updateStory } from '../status.js';

export function initActButton(scene, clock, exceptions = []) {
    const button = document.getElementById('act-button');
    const button2 = document.getElementById('act-button-2');

    // ACT 1: PAUSE & RESET
    if (button) {
        button.addEventListener('click', () => {
            console.log("ACT 1: PAUSE & RESET");
            // if (clock) clock.stop();

            if (scene.physicObjects && scene.physicObjects.length > 0) {

                scene.physicObjects.forEach(obj => {
                    // Check Exceptions (by Name)
                    if (exceptions.includes(obj.name)) return;

                    const body = obj.rapierBody;
                    if (!body) return;

                    // Revert to original State if available
                    if (obj.userData.originalPos && obj.userData.originalRot) {

                        // Capture Original Type
                        const originalBodyType = body.bodyType();

                        // Optimization: Fixed bodies don't need resetting
                        if (originalBodyType === RAPIER.RigidBodyType.Fixed) return;

                        // 1. Switch to Kinematic for controlled movement
                        body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased);

                        // 2. Prepare Tween Data
                        const startPos = obj.position.clone();
                        const startQuat = obj.quaternion.clone();

                        const targetPos = obj.userData.originalPos;
                        const targetEuler = obj.userData.originalRot;
                        const targetQuat = new THREE.Quaternion().setFromEuler(targetEuler);

                        const progress = { val: 0 };

                        new TWEEN.Tween(progress)
                            .to({ val: 1 }, 2000) // 2 seconds duration
                            .easing(TWEEN.Easing.Cubic.InOut)
                            .onUpdate(() => {
                                // Lerp Position
                                const p = new THREE.Vector3().lerpVectors(startPos, targetPos, progress.val);
                                body.setNextKinematicTranslation(p);

                                // Slerp Rotation
                                const q = startQuat.clone().slerp(targetQuat, progress.val);
                                body.setNextKinematicRotation(q);
                            })
                            .onComplete(() => {
                                // 3. Restore Physics State to Original Type
                                body.setBodyType(originalBodyType);

                                // Kill Momentum (if Applicable)
                                if (originalBodyType === RAPIER.RigidBodyType.Dynamic) {
                                    body.setLinvel({ x: 0, y: 0, z: 0 }, true);
                                    body.setAngvel({ x: 0, y: 0, z: 0 }, true);
                                }

                                body.wakeUp();
                            })
                            .start();
                    }
                });
                updateStory("Resetting Scene (Smooth)...");
            } else {
                console.warn("No scene.physicObjects found to reset.");
            }
        });
    }

    // ACT 2: RESUME
    if (button2) {
        button2.addEventListener('click', () => {
            console.log("ACT 2: RESUME CLOCK");
            if (clock) {
                clock.start();
                updateStory("Clock Resumed.");
            }
        });
    }
}
