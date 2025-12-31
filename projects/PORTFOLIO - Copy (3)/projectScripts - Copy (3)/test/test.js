import * as THREE from 'three';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';
import RAPIER from '../rapierPhysics/rapier3d-compat.js';
import { updateStory } from '../utils/status.js';
import { fetchTop10Cryptos } from '../utils/fetchCryptoData.js';
import { getCountryAndBooks } from '../utils/fetchBooks.js';

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

    // ACT 2: RESUME & RESCALE
    if (button2) {
        button2.addEventListener('click', async () => {
            console.log("ACT 2: Button Clicked");

            // --- NEW: FETCH & LOG CRYPTO DATA ---
            try {
                console.log("Fetching Top 10 Crypto Data...");
                const cryptoData = await fetchTop10Cryptos();
                console.table(cryptoData); // console.table for nicer output
            } catch (err) {
                console.error("Crypto Fetch Error:", err);
            }

            // --- NEW: FETCH & LOG BOOKS FOR VIETNAM ---
            try {
                console.log("Fetching Top Books in Vietnam...");
                const vietnamBooks = await getCountryAndBooks("Vietnam");
                console.log("Vietnam Books Data:", vietnamBooks);
            } catch (err) {
                console.error("Books Fetch Error:", err);
            }
            // -------------------------------------

            console.log("ACT 2: RESCALE pokeball (0.9x)");

            const obj = scene.getObjectByName("pokeball");
            if (obj) {
                // 1. Rescale Mesh (Recursive 0.9x)
                obj.scale.multiplyScalar(0.9);
                obj.updateMatrixWorld(true);

                // 2. Rescale Rapier Collider
                if (obj.rapierCollider) {
                    const box = new THREE.Box3().setFromObject(obj);
                    const sphere = new THREE.Sphere();
                    box.getBoundingSphere(sphere);

                    // Apply the 0.5 factor used in original binding
                    // New visual radius is smaller, so this works recursively too.
                    const newRadius = sphere.radius * 0.5;

                    console.log(`Debug - Visual Radius: ${sphere.radius}, New Collider Radius: ${newRadius}`);

                    try {
                        if (typeof obj.rapierCollider.setRadius === 'function') {
                            obj.rapierCollider.setRadius(newRadius);
                        } else {
                            console.warn("setRadius not found on collider", obj.rapierCollider);
                        }
                    } catch (e) {
                        console.error("Failed to setRadius:", e);
                    }
                }
            }

            if (clock) {
                clock.start();
                updateStory("Clock Resumed & Pokeball Scaled (0.9x).");
            }
        });
    }
}
