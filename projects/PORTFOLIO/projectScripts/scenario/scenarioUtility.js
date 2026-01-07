import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';
import * as THREE from 'three';
import * as ARAP from '../rapierPhysics/addRapierWorld.js';
import RAPIER from '../rapierPhysics/rapier3d-compat.js';
import * as GF from '../raycast/gazeFollower.js'
import { slideGlassAnimation } from '../raycast/loadedModelRaycast.js';
import { updateStory } from '../utils/status.js';
import { addDragonBall } from '../resources/addDragonBalls.js';
import { bindBodyObject } from '../rapierPhysics/addRapierWorld.js';
// --- CONSTANTS ---
const SPAWN_DISTANCE = 100;
const SEQUENCE_DELAY = 200;

// Timings


const BOOK_START_DELAY = 100;


// --- HIGH LEVEL HELPERS ---

/**
 * Step 1: Initialize Scenario
 * Pauses the clock, creates a map of all scene objects, and prepares them for the entry animation
 * (e.g., hiding some, moving others to spawn points).
 */
export function initializeScenario(scene, orbitControl, clock) {
    clock.stop();
    // if (orbitControl) orbitControl.update();
    //hide the div of scene.cursorInformer
    // scene.cursorInformer.style.display = "none";
    const objectMap = createSceneMap(scene);
    prepareObjectsForEntry(scene, objectMap);

    return objectMap;
}



/**
 * Step 4: Assemble Scene
 * Orchestrates the "Build Sequence" where objects fly in.
 * - Animates foundations (floor, moon).
 * - Animates furniture and books.
 * - Tweens the Black Hole into place.
 */
export async function assembleScene(scene, objectMap, tweenDuration = 1500) {
    // Step A: Foundations
    await executeBuildStep(objectMap, "moon", tweenDuration, SEQUENCE_DELAY, false);
    await executeBuildStep(objectMap, "floor", tweenDuration, SEQUENCE_DELAY, false);
    await executeBuildStep(objectMap, "floor", tweenDuration, SEQUENCE_DELAY, false);
    // Step B: The Contents (Furniture & Books) starts NOW
    const furnitureTask = tweenRemainingObjects(scene, tweenDuration);

    // --- TWEAKED SECTION ---

    // SETTING: How far into the furniture animation should the black hole start?
    // 0.0 = Start immediately
    // 0.5 = Start when furniture is halfway done
    // 1.0 = Start when the fastest furniture lands
    const TIMING_RATIO = 0.4;

    const calculatedDelay = tweenDuration * TIMING_RATIO;

    updateStory(`Blackhole starting in ${calculatedDelay}ms`);
    await delay(calculatedDelay);

    // -----------------------

    // Step C: The Blackhole
    const blackhole = objectMap.get("blackholeScene");
    if (blackhole) {
        // Using tweenDuration for blackhole too (or maybe a multiplier? Keeping linear for now as requested)
        tweenBlackhole(scene, objectMap, blackhole, tweenDuration);
    }

    // Step D: Wait for everything to settle
    await furnitureTask;
}
// async function addDroneGravityPoint(scene) {
//     scene.rapierWrapper.addGravityPoint('drone')
// }

async function tweenRemainingObjects(scene, tweenDuration) {
    const remainingObjects = getRemainingObjects(scene);

    const books = remainingObjects.filter(obj => /^book\d+$/.test(obj.name));
    const others = remainingObjects.filter(obj => !/^book\d+$/.test(obj.name));
    const easing = TWEEN.Easing.Back.Out;

    // 1. Swarm "Others"
    if (others.length > 0) {
        others.forEach((obj) => {
            // const duration = getRandomDuration(MIN_DURATION, MAX_DURATION);
            tweenSpecificObject(obj, tweenDuration, false, easing);
        });
    }

    // 2. Slide "Books"
    if (books.length > 0) {
        await delay(BOOK_START_DELAY);

        books.forEach((obj) => {
            // const duration = getRandomDuration(MIN_BOOK_DURATION, MAX_BOOK_DURATION);
            tweenSpecificObject(obj, tweenDuration, true);
        });

        await delay(tweenDuration);
    } else {
        await delay(tweenDuration);
    }
}

/**
 * Step 6: Apply Physics
 * Resumes the clock and activates the physics world.
 * This makes dynamic objects start falling/interacting.
 */
export async function applyPhysics(scene, objectMap, clock) {
    // const planeSky = objectMap.get("planeSky");
    // if (planeSky) planeSky.visible = true;

    objectMap.forEach((obj, name) => {
        if (/^dragonBall\d+Stars$/.test(name)) {
            obj.visible = true;
        }
    });

    clock.start();
    updateStory("Clock Resumed.");

    if (scene.world) {
        scene.world.isActive = true;
        updateStory("Physics Activated.");
    }
}

// --- BLACKHOLE LOGIC ---

function initializeBlackholeState(obj) {
    obj.userData.originalPos = obj.position.clone();
    obj.userData.originalScale = obj.scale.clone();
    obj.userData.originalRot = obj.rotation.clone();

    // 1. Apply Position Offset (X Axis, Direction -1)
    applyAxisOffset(obj, SPAWN_DISTANCE, 'x', -1);

    // 2. Apply Scale & Rotation Offset
    obj.scale.set(0, 0, 0);
    obj.rotation.z += 0.1 * Math.PI * 2;

    obj.visible = true;
}

function tweenBlackhole(scene, objectMap, obj, duration) {
    if (!obj.userData.originalPos || !obj.userData.originalScale || !obj.userData.originalRot) return;

    // Capture Start States
    const startPos = obj.position.clone();
    const endPos = obj.userData.originalPos;

    const startScale = obj.scale.clone();
    const endScale = obj.userData.originalScale;

    const startRotZ = obj.rotation.z;
    const endRotZ = obj.userData.originalRot.z;

    // Master Tween: Runs from 0 to 2
    // Phase 1 (0-1): Position
    // Phase 2 (1-2): Scale & Rotation
    const totalDuration = duration * 2;
    const progress = { t: 0 };

    new TWEEN.Tween(progress)
        .to({ t: 2 }, totalDuration)
        .easing(TWEEN.Easing.Linear.None) // Manual easing inside onUpdate
        .onUpdate(() => {
            const t = progress.t;

            // --- Phase 1: Position ---
            if (t <= 1) {
                const easePos = TWEEN.Easing.Back.Out(t);
                obj.position.lerpVectors(startPos, endPos, easePos);
            } else {
                // Ensure Position is final (in case of frame skip)
                obj.position.copy(endPos);

                // --- Phase 2: Scale & Rotation ---
                const localT = Math.min(t - 1, 1); // Clamp to 0-1

                // Scale (Back.Out)
                const easeScale = TWEEN.Easing.Back.Out(localT);
                obj.scale.lerpVectors(startScale, endScale, easeScale);

                // Rotation Z (Back.InOut)
                const easeRot = TWEEN.Easing.Back.InOut(localT);
                obj.rotation.z = startRotZ + (endRotZ - startRotZ) * easeRot;
            }
        })
        .onComplete(() => {
            // Finalize state just in case
            obj.position.copy(endPos);
            obj.scale.copy(endScale);
            obj.rotation.z = endRotZ;

            activateBulb(scene, objectMap);
        })
        .start();
}

// --- CORE LOGIC ---

function prepareObjectsForEntry(scene, objectMap) {
    const planeSky = objectMap.get("planeSky");
    if (planeSky) planeSky.visible = false;

    objectMap.forEach((obj, name) => {
        if (/^dragonBall\d+Stars$/.test(name)) obj.visible = false;
    });

    const specificConfig = [
        { name: "moon", axis: 'x', dir: -1 },
        { name: "floor", axis: 'z', dir: 1 }
    ];

    specificConfig.forEach(config => {
        const obj = objectMap.get(config.name);
        if (obj) initializeObjectState(obj, config.axis, config.dir, false);
    });

    const blackhole = objectMap.get("blackholeScene");
    if (blackhole) initializeBlackholeState(blackhole);

    const leftovers = getRemainingObjects(scene);
    leftovers.forEach(obj => {
        const isBook = /^book\d+$/.test(obj.name);
        if (isBook) {
            initializeObjectState(obj, 'x', 1, true);
        } else {
            initializeObjectState(obj, null, null, false);
        }
    });

    // const droneEye = objectMap.get("drone");
    // const bulb = objectMap.get("bulb");
    // droneEye.add(bulb)
    // bulb.position.set(0, 0, 0);


    // if (droneEye) initializeObjectState(droneEye, null, null, false);
}

function initializeObjectState(obj, fixedAxis = null, fixedDirection = null, enableSpin = false) {
    obj.userData.originalPos = obj.position.clone();
    obj.userData.originalScale = obj.scale.clone();
    obj.userData.originalRot = obj.rotation.clone();

    const direction = fixedDirection !== null ? fixedDirection : (Math.random() > 0.5 ? 1 : -1);
    applyAxisOffset(obj, SPAWN_DISTANCE, fixedAxis, direction);

    if (enableSpin) {
        const rounds = Math.random() * 50 + 50;
        const rotationAmount = rounds * (Math.PI * 2);
        const spinDir = Math.random() > 0.5 ? 1 : -1;
        obj.rotation.y += rotationAmount * spinDir;
    }

    obj.scale.set(0, 0, 0);
    obj.visible = true;
}

function tweenSpecificObject(obj, duration, enableSpin = false, easing = TWEEN.Easing.Cubic.Out) {
    if (!obj.userData.originalPos) return;

    // const easing = TWEEN.Easing.Back.InOut;

    new TWEEN.Tween(obj.position)
        .to(obj.userData.originalPos, duration)
        .easing(easing)
        .start();

    new TWEEN.Tween(obj.scale)
        .to(obj.userData.originalScale, duration)
        .easing(easing)
        .start();

    if (enableSpin) {
        new TWEEN.Tween(obj.rotation)
            .to({
                x: obj.userData.originalRot.x,
                y: obj.userData.originalRot.y,
                z: obj.userData.originalRot.z
            }, duration)
            .easing(easing)
            .start();
    }
}

// --- UTILS & HELPERS ---

function getRemainingObjects(scene) {
    const excludedNames = ["moon", "floor", "planeSky", "blackholeScene", "PointsCloud"];
    const targets = [];
    scene.children.forEach((child) => {
        if (child.isCamera) return
        if ((child.isMesh || child.isGroup || child.isObject3D) && child.visible) {
            if (!excludedNames.includes(child.name) && !/^dragonBall\d+Stars$/.test(child.name)) {
                targets.push(child);
            }
        }
    });
    return targets;
}

function getRandomDuration(min, max) {
    return Math.random() * (max - min) + min;
}

async function executeBuildStep(objectMap, targetName, duration, waitTime, enableSpin = false) {
    const obj = objectMap.get(targetName);
    if (obj) {
        tweenSpecificObject(obj, duration, enableSpin);
        if (waitTime > 0) await delay(waitTime);
    }
}

function applyAxisOffset(object, offset, axis = null, direction = 1) {
    const axes = ['x', 'y', 'z'];
    let selectedAxis = axis;

    if (!selectedAxis || !axes.includes(selectedAxis)) {
        const randomIndex = Math.floor(Math.random() * 3);
        selectedAxis = axes[randomIndex];
    }

    object.position[selectedAxis] += offset * direction;
}

function createSceneMap(scene) {
    const map = new Map();
    scene.traverse((child) => {
        if (child.name) map.set(child.name, child);
    });
    return map;
}

/**
 * Step 3: Handle User Entry
 * Manages the "Loading -> Ready -> Enter" UI flow.
 * Returns a Promise that resolves when the user clicks 'ENTER'.
 */
export function handleUserEntry(scene) {
    return new Promise((resolve) => {
        const enterButton = document.getElementById('enter-button');
        const loadingContainer = document.getElementById('loading-container');
        const progressText = document.getElementById('progress-text');
        const progressBar = document.getElementById('progress-bar');

        if (progressText) progressText.innerText = "Ready";
        if (progressBar) progressBar.parentElement.style.display = 'none';

        // Auto-Enter Logic: Simulate immediate click
        if (loadingContainer) {
            loadingContainer.style.opacity = '0';
            setTimeout(() => { loadingContainer.style.display = 'none'; }, 500);
        }
        resolve();
    });
}

export function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// DRONE
/**
 * Step 7: Play Drone
 * Animates the drone flying along a curved path and initializes its "Gaze Follower" behavior upon completion.
 */
let droneEndPos, droneEndRot;
export async function playDrone(scene, tweenDuration = 3000) {
    const drone = scene.getObjectByName('drone');
    // const droneBody = drone.ra

    if (!drone) {
        console.error("Drone not found");
        return;
    }

    return new Promise((resolve) => {
        // --- 1. Define Path Points (Renamed) ---
        const startPoint = drone.position.clone();
        const midPoint = new THREE.Vector3(9, 1, -1.3);
        const endPoint = new THREE.Vector3(-1, 9, -5);
        droneEndPos = endPoint;
        // --- 2. Create the Curve ---
        const curve = new THREE.CatmullRomCurve3(
            [startPoint, midPoint, endPoint],
            false,
            'centripetal'
        );

        // --- 3. Rotation Setup (Quaternion Slerp) ---
        // A. Capture the starting rotation
        const startQuaternion = drone.quaternion.clone();

        // B. Define the target rotation
        // User requested Euler: (-Math.PI/2, 0.2, 1.25)
        const targetEuler = new THREE.Euler(-Math.PI / 2, 0.2, 1.25);
        const endQuaternion = new THREE.Quaternion().setFromEuler(targetEuler);

        // Fine-tuning: Rotate 90 degrees on X axis
        const xRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        endQuaternion.multiply(xRot);

        droneEndRot = endQuaternion;

        const tObj = { val: 0 };
        let quat = new THREE.Quaternion()
        new TWEEN.Tween(tObj)
            .to({ val: 1 }, tweenDuration)
            .easing(TWEEN.Easing.Quadratic.InOut)
            .onStart(() => {
                let gazeFollower = new GF.GazeFollower(drone)
                gazeFollower.init()
                scene.gazeFollower = gazeFollower
            })
            .onUpdate(() => {
                // --- 4. Update Loop ---

                // A. Update Position
                const point = curve.getPoint(tObj.val);
                drone.rapierBody.setNextKinematicTranslation(point)
                // drone.position.copy(point);

                // B. Update Rotation (SLERP)
                // Smoothly blend from startQuaternion to endQuaternion based on progress 'val'
                quat.copy(startQuaternion).slerp(endQuaternion, tObj.val);
                drone.rapierBody.setRotation(quat)
                // drone.lookAt(scene.camera.position) // <--- CAUSED SNAP
                // quat.copy(drone.quaternion)
                // drone.rapierBody.setRotation(quat)
            })
            .onComplete(() => {
                // Force final state to fix tab-switch sync issues
                drone.rapierBody.setTranslation(endPoint, true);

                // Allow GazeFollower to take over smoothly
                // drone.lookAt(scene.camera.position); 
                // quat.copy(drone.quaternion);
                drone.rapierBody.setRotation(endQuaternion, true);


                drone.rapierBody.setBodyType(RAPIER.RigidBodyType.Dynamic)
                drone.rapierBody.setGravityScale(0)
                // drone.rapierBody.setLinearDamping(10)
                // drone.rapierBody.setAngularDamping(10)

                resolve();
            })
            .start();
    });
    return { end }
}
//ENVIRONMENT CONTROL
function deactivateSky(scene) {
    scene.constantUniform.uStormSharpness.value = 0
}
function deactivateRain(scene) {
    const uniform = scene.constantUniform
    //sky rain
    uniform.enableLightning.value = false
    uniform.uRainHeaviness.value = 0
    //glass rain
    uniform.glassRainAmount.value = 0
    uniform.rainGlassOpacity.value = 0
}

function blackenObjects(scene) {
    const floor = scene.getObjectByName('floor');
    const chair = scene.getObjectByName('Object_0003_3'); // Consider renaming this in Blender/Maya if possible!
    const blackCat = scene.getObjectByName('Object_12001');
    if (floor?.material) floor.material.envMapIntensity = 0.1;
    if (chair?.material) chair.material.envMapIntensity = 0.7;
    if (blackCat?.material) blackCat.material.envMapIntensity = 0.0;

    scene.environmentIntensity = 0.4
}


/**
 * Step 2: Deactivate Environment
 * Resets environment uniforms (rain, storm) and darkens materials to prepare for the "Build" sequence.
 */
export function deactivateEnvironment(scene) {
    deactivateSky(scene)
    deactivateRain(scene)
    blackenObjects(scene)
}

// RAIN CONTROL
/**
 * Step 5: Activate Environment
 * Activates rain, storm effects, and moves the moon slightly.
 * Also ramps up "sharpness" and opacity for a dramatic effect.
 */
export function activateEnvironment(scene, tweenDuration = 12000) {
    let constantUniform = scene.constantUniform
    let rainStartTime = tweenDuration
    let easing = TWEEN.Easing.Linear.None
    const glassRainProgress = { val: 0 };
    let glassRainTween = new TWEEN.Tween(glassRainProgress)
        .to({ val: 1 }, rainStartTime)
        .easing(easing)
        .onUpdate(() => {
            scene.constantUniform.glassRainAmount.value = glassRainProgress.val; // 
            scene.constantUniform.rainGlassOpacity.value = glassRainProgress.val;
        });

    let moonPosYTween = new TWEEN.Tween(constantUniform.uMoonPosition.value)
        .to({ x: "+0.001", y: "+0.05" }, rainStartTime * 2)
        .easing(easing)

    const progress = { t: 0 };
    new TWEEN.Tween(progress)
        .to({ t: 1 }, rainStartTime)
        .easing(easing)
        .onUpdate(() => {
            scene.constantUniform.uStormSharpness.value = progress.t;
            scene.constantUniform.uRainHeaviness.value = progress.t * 0.75;
        })
        .onStart(() => {

            setTimeout(() => {
                glassRainTween.start()
                moonPosYTween.start()
            }, rainStartTime * 0.4)
        })
        .onComplete(() => {
            // scene.constantUniform.enableLightning.value = true
        })
        .start()
}

// BULB LIGHT CONTROL
export function activateBulb(scene, objectMap, tweenDuration = 5000) {
    let bulb = objectMap.get("bulb");
    if (!bulb) return;

    let targetIntensity = 1000;
    let targetDistance = 25;
    let targetScale = new THREE.Vector3(1, 1, 1);
    let targetPosition = new THREE.Vector3(-1.5, 9.2, -0.30);
    let targetRotation = bulb.rotation.clone();

    // Safety check for light object, assuming it's named 'bulbLight'
    let bulbLight = bulb.getObjectByName("bulbLight");

    // Start State
    let startIntensity = bulbLight ? bulbLight.intensity : 0;
    let startDistance = bulbLight ? bulbLight.distance : 0;
    let startScale = new THREE.Vector3(0, 0, 0)//bulb.scale.clone();

    // START POSITION: 'Lathe_Center'
    let latheCenter = objectMap.get("Lathe_Center");
    let startPosition = new THREE.Vector3();
    if (latheCenter) {
        latheCenter.getWorldPosition(startPosition);
    } else {
        startPosition.copy(bulb.position); // Fallback
    }

    // Force set bulb to start position immediately
    bulb.position.copy(startPosition);

    let progress = { t: 0 };

    // BLACKHOLE CLIP ANIMATION
    const clip = scene.animations[1]
    const action = scene.mixer.clipAction(clip)
    // action.timeScale = -1

    // 1. Single Merged Tween
    new TWEEN.Tween(progress)
        .to({ t: 1 }, tweenDuration) // Duration: 5s
        .easing(TWEEN.Easing.Back.Out)
        .onStart(() => {
        })
        .onUpdate(() => {
            action.timeScale = 1 + progress.t * 2;

            const t = progress.t;

            // --- A. Scale & Light ---
            bulb.scale.lerpVectors(startScale, targetScale, t);

            if (bulbLight) {
                bulbLight.intensity = THREE.MathUtils.lerp(startIntensity, targetIntensity, t);
                bulbLight.distance = THREE.MathUtils.lerp(startDistance, targetDistance, t * 5);
            }

            // --- B. Position (Helix Path) ---

            // 1. Linear Baseline Movement
            bulb.position.lerpVectors(startPosition, targetPosition, t);

            // 2. Helix / Spiral Offset
            const helixRadius = 1.5;
            const revs = 4.0;

            // Amplitude Window: 0 -> Max -> 0
            const amp = Math.sin(t * Math.PI) * helixRadius;

            // REVERSE DIRECTION: Negative angle
            const angle = -t * Math.PI * 2 * revs;

            // Add offsets
            bulb.position.y += Math.cos(angle) * amp;
            bulb.position.z += Math.sin(angle) * amp;

            // --- C. Rotation ---
            const spin = (1 - t) * Math.PI * 2 * 4.0;
            bulb.rotation.set(
                targetRotation.x + spin,
                targetRotation.y,
                targetRotation.z
            );
        })
        .onComplete(() => {
            action.timeScale = 1;
            new TWEEN.Tween(bulbLight)
                .to({ intensity: 800 }, 3000)
                .easing(TWEEN.Easing.Back.Out)
                .start();

            spawnDragonBalls(scene, bulb);

            // console.log(bulb.position)
        })
        .start();
}


function spawnDragonBalls(scene, sourceObject) {
    const dropStartDelay = 100; // Wait 1s
    const dropInterval = 300;   // 0.4s between each ball

    scene.dragonBalls = scene.dragonBalls || [];

    const startOscStrength = 2

    setTimeout(() => {
        updateStory("The Dragon Balls descend...");

        for (let i = 1; i <= 7; i++) {
            setTimeout(() => {
                // 1. Create Ball
                const ball = addDragonBall(scene, i);
                // 2. Position at Source (slightly below)
                const dropPos = sourceObject.position.clone();
                dropPos.y -= 0.5;

                // Random slight offset to avoid perfect stacking
                dropPos.x += (Math.random() - 0.5) * 0.2;
                dropPos.z += (Math.random() - 0.5) * 0.2;

                ball.position.copy(dropPos);

                // 3. Bind Physics
                // Important: set Rapier body position to match ThreeJS position
                if (ball.rapierBody) {
                    ball.rapierBody.setTranslation(dropPos, true);
                    ball.rapierBody.wakeUp();
                }
                // add a small impulse of x = 0.5


                // Initialize Oscillation Strength (Spiky) in userData
                ball.userData.oscStrength = startOscStrength;
                const aura = ball.children.find(c => c.name.startsWith("Aura"));
                if (aura) aura.userData.oscStrength = startOscStrength;

                // --- SHARED MATERIAL OVERRIDES ---
                // Helper to Apply Per-Object Uniforms
                const applyOscillationOverride = (mesh) => {
                    mesh.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
                        if (material.uniforms && material.uniforms.uOscillationStrength) {
                            // Save original global value
                            this.userData.prevOsc = material.uniforms.uOscillationStrength.value;
                            // Set per-object value
                            material.uniforms.uOscillationStrength.value = this.userData.oscStrength;
                        }
                    };

                    mesh.onAfterRender = function (renderer, scene, camera, geometry, material, group) {
                        if (material.uniforms && material.uniforms.uOscillationStrength) {
                            // Restore original global value
                            material.uniforms.uOscillationStrength.value = this.userData.prevOsc;
                        }
                    };
                };

                applyOscillationOverride(ball);
                if (aura) applyOscillationOverride(aura);

                // Initialize Scale (Small)
                const targetScale = ball.scale.clone();
                let initialScaleVal = 0.1;
                ball.scale.multiplyScalar(initialScaleVal);


                bindBodyObject(scene, ball, ball.rapierBody, ball.rapierShape);
                if (ball.rapierBody) {
                    const impulseZ = (Math.random() > 0.5 ? 3 : -3) * (0.7 + Math.random());
                    ball.rapierBody.applyImpulse(new THREE.Vector3(5, 0, impulseZ), true);
                }

                // Calculate Ratio dynamically
                let radiusRatio = 0.5;
                if (ball.rapierShape && ball.rapierShape.radius && targetScale.x > 0) {
                    radiusRatio = ball.rapierShape.radius / targetScale.x;
                }

                ball.rapierCollider.setRadius(ball.scale.x * radiusRatio);

                // 4. Oscillation Tween (Spiky -> Round) && Scale Tween (Small -> Big)
                // Wait 2s, then tween over 4s
                const tweenStartDelay = 3000;
                setTimeout(() => {
                    const tweenDuration = 4500;
                    const progress = { t: 0 };
                    // User set 0.025

                    // Capture start states
                    const startScale = targetScale.clone().multiplyScalar(initialScaleVal);


                    // 1. Scale Tween (Quadratic In - Starts Slow, Ends Fast)
                    // Note: User description "grow fast start" contradicts "Quadratic In". 
                    // complying with "Quadratic In" to hide displacement artifacts at start.
                    const scaleProgress = { t: 0 };
                    new TWEEN.Tween(scaleProgress)
                        .to({ t: 1 }, tweenDuration)
                        .easing(TWEEN.Easing.Cubic.Out) // Fast start, slow end
                        .onUpdate(() => {
                            const t = scaleProgress.t;
                            // Scale (Start -> Target)
                            ball.scale.lerpVectors(startScale, targetScale, t);

                            // Collider Resize (Sync with Scale)
                            if (ball.rapierCollider) {
                                try {
                                    if (typeof ball.rapierCollider.setRadius === 'function') {
                                        // change to 
                                        ball.rapierCollider.setRadius(ball.scale.x * radiusRatio);

                                    }
                                } catch (e) { }
                            }
                        })
                        .start();

                    // 2. Oscillation Tween (Quadratic Out - Starts Fast, Ends Slow)
                    const oscProgress = { t: 0 };
                    new TWEEN.Tween(oscProgress)
                        .to({ t: 1 }, tweenDuration)
                        .easing(TWEEN.Easing.Exponential.In)
                        .onUpdate(() => {
                            const t = oscProgress.t;
                            // Oscillation Strength (Start -> 0)
                            const currentOsc = startOscStrength * (1 - t);
                            ball.userData.oscStrength = currentOsc;
                            if (aura) aura.userData.oscStrength = currentOsc;
                        })
                        .start();

                }, tweenStartDelay);



            }, i * dropInterval);
        }

        // Enable Gravity Interaction after all balls + 3s
        // 7 balls * 600ms = 4200ms approx + 3000ms delay = 7200ms
        const totalSpawnTime = 8 * dropInterval; // Using 8 to match loop index limit + buffer
        setTimeout(() => {
            updateStory("Point Gravity System Online.");
            if (scene.world) scene.world.hasPointGravityOnBalls = true;
        }, totalSpawnTime + 3000);

    }, dropStartDelay);
}

export function callMjolnir(scene, tweenDuration = 2000) {
    const hammer = scene.getObjectByName('mjolnir_low_mjolnir_hammer_0');
    if (hammer && hammer.rapierBody) {
        updateStory("Boomerang Mjolnir initiated");
        // Use stored original state
        const originalPos = hammer.userData.originalPos;
        const originalRot = hammer.userData.originalRot;

        if (!originalPos || !originalRot) {
            console.error("Mjolnir missing userData.originalPos/Rot");
            return;
        }

        // 1. Destination
        // const destinationPos = originalPos.clone();
        // destinationPos.y += 2;
        const destinationPos = new THREE.Vector3(-5.22, 9.54, 4);

        // 2. Set Start State (Far away)
        const startPos = new THREE.Vector3(-20, 15, 30);

        // Switch to Kinematic
        hammer.rapierBody.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased);
        hammer.rapierBody.wakeUp();

        // Teleport to start
        hammer.rapierBody.setTranslation(startPos, true);

        // Rotation: Identity + 90 degrees X
        const baseQuat = new THREE.Quaternion(0, 0, 0, 1);
        const x90 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
        baseQuat.multiply(x90);

        hammer.rapierBody.setRotation(baseQuat, true);



        // 3. Define Curved Path
        // const midPoint1 = new THREE.Vector3(2.92, 5, -2.43);
        // const midPointAir = new THREE.Vector3(-450, 155, 320);
        const midPointWindow = new THREE.Vector3(7, 6, 8);

        const midPointCam = new THREE.Vector3(12, 4, 0);
        let drone = scene.getObjectByName('drone');
        // Offset the target slightly so we don't penetrate the exact center (which causes extreme physics repulsion)
        const midPointDrone = new THREE.Vector3(drone.position.x, drone.position.y, drone.position.z);

        const curve = new THREE.CatmullRomCurve3(
            [startPos, midPointWindow, midPointCam, midPointDrone, destinationPos],
            false, // closed
            'centripetal'
        );

        // --- EXPLANATION: setSensor(true) ---
        // We switch the collider to 'Sensor' mode during the controlled animation.
        // 1. A Kinematic body normally has 'infinite mass' and would crush the drone on contact,
        //    causing unstable physics or sending it flying instantly.
        // 2. 'Sensor' disables physical collision resolution (no bouncing/pushing).
        // 3. This allows the hammer to pass THROUGH the drone while we manually calculate
        //    and apply a controlled impulse (see "Manual Collision Check" below).
        let hammerCollider = null;
        if (hammer.rapierBody.numColliders() > 0) {
            hammerCollider = hammer.rapierBody.collider(0);
            hammerCollider.setSensor(true);
        }
        hammer.userData.hitDrone = false;

        // 4. Tween
        const progress = { val: 0 };
        new TWEEN.Tween(progress)
            .to({ val: 1 }, tweenDuration)
            .easing(TWEEN.Easing.Cubic.Out)
            .onUpdate(() => {
                // Position on Curve
                const currentPos = curve.getPoint(progress.val);
                hammer.rapierBody.setNextKinematicTranslation(currentPos);

                // Rotation (Spinning Effect)
                // Spin 15 times around Local Y (Handle)
                const angle = progress.val * Math.PI * 30;
                const axis = new THREE.Vector3(0, 1, 0); // Handle
                const rotQuat = new THREE.Quaternion().setFromAxisAngle(axis, angle);

                // Combine with base orientation
                const finalQuat = baseQuat.clone().multiply(rotQuat);

                hammer.rapierBody.setNextKinematicRotation(finalQuat);

                // Manual Collision Check with Drone
                if (drone && drone.rapierBody && !hammer.userData.hitDrone) {
                    const dist = currentPos.distanceTo(drone.position);
                    if (dist < 3.0) { // Hit threshold
                        // Capture State BEFORE Hit (for recovery)
                        // const recoveryPos = drone.position.clone();
                        const recoveryRot = drone.quaternion.clone();
                        const recoveryPos = droneEndPos.clone();
                        // const recoveryRot = droneEndRot.clone();

                        // Apply Strong Impulse
                        updateStory("Hammer hit! Drone Impact.");
                        drone.rapierBody.wakeUp();

                        // Direction: Up and Away
                        // Mass is now ~2.5, so Impulse 50 -> 20 m/s
                        drone.rapierBody.applyImpulse({ x: -100, y: 75, z: -100 }, true);
                        drone.rapierBody.applyTorqueImpulse({ x: 5., y: 5., z: 5 }, true); // Slight spin

                        hammer.userData.hitDrone = true;
                        console.log("Manual Impulse Applied: { x: 0, y: 15, z: -50 }");

                        // Schedule Recovery
                        setTimeout(() => {
                            updateStory("Drone recovering...");
                            drone.rapierBody.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased);

                            // Tween back
                            const startPos = drone.position.clone();
                            const startRot = drone.quaternion.clone();
                            const tObj = { val: 0 };

                            new TWEEN.Tween(tObj)
                                .to({ val: 1 }, 2000)
                                .easing(TWEEN.Easing.Back.InOut)
                                .onUpdate(() => {
                                    const p = new THREE.Vector3().lerpVectors(startPos, recoveryPos, tObj.val);
                                    const q = startRot.clone().slerp(recoveryRot, tObj.val);
                                    drone.rapierBody.setNextKinematicTranslation(p);
                                    drone.rapierBody.setNextKinematicRotation(q);
                                })
                                .onComplete(() => {
                                    // Restore to Dynamic Hover
                                    // drone.rapierBody.setBodyType(RAPIER.RigidBodyType.Dynamic);
                                    drone.rapierBody.setGravityScale(0);
                                    drone.rapierBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
                                    drone.rapierBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
                                    updateStory("Drone recovery complete.");
                                })
                                .start();

                        }, 2000);
                    }
                }
            })
            .onComplete(() => {
                updateStory("Mjolnir Returned.");
                // 5. Revert to Dynamic
                hammer.rapierBody.setBodyType(RAPIER.RigidBodyType.Dynamic);

                // Update Integrity Baseline to new position
                hammer.userData.originalPos = hammer.position.clone();
                // Store rotation as Euler to match initial setup format
                hammer.userData.originalRot = new THREE.Euler().setFromQuaternion(hammer.quaternion);

                // Return to Solid Physics
                // We disable Sensor mode so the hammer becomes a physical object again,
                // capable of resting on the floor and colliding normally.
                if (hammerCollider) {
                    hammerCollider.setSensor(false);
                }
                hammer.userData.hitDrone = false;

                hammer.rapierBody.wakeUp();
            })
            .start();

    } else {
        console.warn("Mjolnir mesh or rapierBody not found");
    }
}

export function togglePointsEnvironment(scene, enable = true) {
    const container = scene.domElement;
    const camera = scene.camera
    const orbitControl = scene.OrbitControls;
    if (enable) {
        // --- ENABLE STATE ---
        // 0. Disable Informer Logic Global Flag
        scene.cursorInformerEnabled = false;

        // 1. Hide Informer Wrapper
        if (scene.cursorInformer && scene.cursorInformer.hide) {
            scene.cursorInformer.hide();
        } else if (scene.cursorInformer) {
            scene.cursorInformer.style.display = 'none';
        }

        // 2. Change Scene State
        scene.scenarioState = 'points';

        // 3. Apply Background Gradient
        if (container) {
            container.style.background = 'linear-gradient(to right, rgb(83.137% 83.137% 83.137%) 0%, rgb(78.408% 78.408% 78.408%) 1.5625%, rgb(73.68% 73.68% 73.68%) 3.125%, rgb(68.951% 68.951% 68.951%) 4.6875%, rgb(64.222% 64.222% 64.222%) 6.25%, rgb(60.35% 60.35% 60.35%) 7.8125%, rgb(56.478% 56.478% 56.478%) 9.375%, rgb(52.606% 52.606% 52.606%) 10.9375%, rgb(48.734% 48.734% 48.734%) 12.5%, rgb(45.609% 45.609% 45.609%) 14.0625%, rgb(42.483% 42.483% 42.483%) 15.625%, rgb(39.358% 39.358% 39.358%) 17.1875%, rgb(36.232% 36.232% 36.232%) 18.75%, rgb(33.75% 33.75% 33.75%) 20.3125%, rgb(31.268% 31.268% 31.268%) 21.875%, rgb(28.786% 28.786% 28.786%) 23.4375%, rgb(26.305% 26.305% 26.305%) 25%, rgb(24.372% 24.372% 24.372%) 26.5625%, rgb(22.439% 22.439% 22.439%) 28.125%, rgb(20.506% 20.506% 20.506%) 29.6875%, rgb(18.573% 18.573% 18.573%) 31.25%, rgb(17.101% 17.101% 17.101%) 32.8125%, rgb(15.63% 15.63% 15.63%) 34.375%, rgb(14.158% 14.158% 14.158%) 35.9375%, rgb(12.686% 12.686% 12.686%) 37.5%, rgb(11.596% 11.596% 11.596%) 39.0625%, rgb(10.505% 10.505% 10.505%) 40.625%, rgb(9.414% 9.414% 9.414%) 42.1875%, rgb(8.323% 8.323% 8.323%) 43.75%, rgb(7.542% 7.542% 7.542%) 45.3125%, rgb(6.76% 6.76% 6.76%) 46.875%, rgb(5.978% 5.978% 5.978%) 48.4375%, rgb(5.196% 5.196% 5.196%) 50%, rgb(4.658% 4.658% 4.658%) 51.5625%, rgb(4.121% 4.121% 4.121%) 53.125%, rgb(3.584% 3.584% 3.584%) 54.6875%, rgb(3.046% 3.046% 3.046%) 56.25%, rgb(2.695% 2.695% 2.695%) 57.8125%, rgb(2.345% 2.345% 2.345%) 59.375%, rgb(1.995% 1.995% 1.995%) 60.9375%, rgb(1.644% 1.644% 1.644%) 62.5%, rgb(1.431% 1.431% 1.431%) 64.0625%, rgb(1.218% 1.218% 1.218%) 65.625%, rgb(1.005% 1.005% 1.005%) 67.1875%, rgb(0.793% 0.793% 0.793%) 68.75%, rgb(0.676% 0.676% 0.676%) 70.3125%, rgb(0.559% 0.559% 0.559%) 71.875%, rgb(0.442% 0.442% 0.442%) 73.4375%, rgb(0.325% 0.325% 0.325%) 75%, rgb(0.269% 0.269% 0.269%) 76.5625%, rgb(0.214% 0.214% 0.214%) 78.125%, rgb(0.158% 0.158% 0.158%) 79.6875%, rgb(0.103% 0.103% 0.103%) 81.25%, rgb(0.082% 0.082% 0.082%) 82.8125%, rgb(0.061% 0.061% 0.061%) 84.375%, rgb(0.041% 0.041% 0.041%) 85.9375%, rgb(0.02% 0.02% 0.02%) 87.5%, rgb(0.016% 0.016% 0.016%) 89.0625%, rgb(0.011% 0.011% 0.011%) 90.625%, rgb(0.006% 0.006% 0.006%) 92.1875%, rgb(0.001% 0.001% 0.001%) 93.75%, rgb(0% 0% 0%) 100%)';
            console.log("togglePointsEnvironment: Gradient ENABLED");
        }

        // camera
        // const CAMERA_POSITION = { x: 61.56, y: 2.97, z: 30 };
        // camera.position.set(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);

    } else {
        // --- DISABLE STATE ---
        // 0. Enable Informer Logic Global Flag
        scene.cursorInformerEnabled = true;

        // 1. Show Informer Wrapper
        if (scene.cursorInformer && scene.cursorInformer.show) {
            scene.cursorInformer.show();
        } else if (scene.cursorInformer) {
            scene.cursorInformer.style.display = 'block';
        }

        // 2. Change Scene State
        scene.scenarioState = 'room';

        // 3. Reset Background to Black
        if (container) {
            container.style.background = 'black';
            console.log("togglePointsEnvironment: Gradient DISABLED (Black)");
        }

        camera.position.set(17.4192690499384, 4.136164408312478, 0.015309904980740474);
        camera.rotation.set(-0.04520672934354282, 1.5515547851416993, 0.045198372394982464);

        orbitControl.target.set(-3.226367634071287, 4.1182097600816245, -0.38158710192007556);
        orbitControl.update();
    }
}