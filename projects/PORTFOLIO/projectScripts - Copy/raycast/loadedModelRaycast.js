import * as THREE from 'three';
import * as RAYCAST from './addRaycaster.js';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';
import * as CONSTANTS from '../constant.js';
import * as LIGHT from '../addLights.js';
import * as B64 from '../base64Strings.js';
import * as GF from './gazeFollower.js'

// --- Global Arrays ---
const RAY_BLOCKERS = ['floor', 'backWall_rapier', 'rightWall', 'glass2'];
const BOOKS = [];

// --- Standard Interactions (UPDATED DEFAULT) ---
// MOST objects use highlight, so this is now the default.
const standardEnter = (scene, obj) => {
    RAYCAST.highlightObject(scene, obj);
    if (scene.gazeFollower) scene.gazeFollower.lookAtTarget(obj)
};

const standardLeave = (scene) => {
    RAYCAST.restoreMaterials(scene);
    if (scene.gazeFollower) scene.gazeFollower.lookAtTarget(scene.camera)
};

const standardClick = (scene, clickedObject, intersection, forceMultiplier = null) => {
    forceMultiplier = forceMultiplier || Math.random() * 1 + 2.5;
    RAYCAST.applyImpulse(scene, clickedObject, intersection, forceMultiplier);
};

// =========================================================
// MAIN EXPORT
// =========================================================

export function loadedModelRaycast(scene) {
    const objectMap = new Map();

    // 1. Single Traversal
    scene.traverse((child) => {
        if (child.name) objectMap.set(child.name, child);
        if (/^book\d+$/.test(child.name)) BOOKS.push(child);
    });

    // 2. Define Stats
    const pokeballStat = {
        gravityCenter: new THREE.Vector3(-0.5, 3.5, 4.9),
        tgtPos: new THREE.Vector3(-2, 3.09, 6.42),
        tgtQuat: new THREE.Quaternion(-0.09, 0.48, -0.05, 0.87)
    };

    // 3. Get Config
    const interactionConfig = getInteractionConfig(scene, objectMap, pokeballStat);

    // 4. List of objects to register 
    const objectsToRegister = [
        ...Object.keys(interactionConfig),
        'pokeball2',
        'questionCube',
        'aegis',
        'aegis2',
        'caseCover',
        'mjolnir_low_mjolnir_hammer_0'
    ];

    // 5. Apply Raycasting
    objectsToRegister.forEach((name) => {
        const object = objectMap.get(name);
        if (!object) return;

        const config = interactionConfig[name] || {};

        // Use Custom Logic if defined, otherwise use Standard Defaults
        const baseOnEnter = config.onEnter
            ? (obj) => config.onEnter(obj)
            : (obj) => standardEnter(scene, obj);

        // Wrap it: Run sampleEnter first, then the specific logic
        const handleEnter = (obj) => {
            if (scene.gazeFollower) scene.gazeFollower.lookAtTarget(obj); // <--- The new global function
            baseOnEnter(obj);
        };
        const baseOnLeave = config.onLeave
            ? (obj) => config.onLeave(obj)
            : (obj) => standardLeave(scene, obj);

        // Wrap it: Run sampleEnter first, then the specific logic
        const handleLeave = (obj) => {
            if (scene.gazeFollower) scene.gazeFollower.lookAtTarget(scene.camera); // <--- The new global function
            baseOnLeave(obj);
        };
        // const handleLeave = config.onLeave 
        //     ? () => config.onLeave() 
        //     : () => standardLeave(scene);

        const handleClick = config.onClick
            ? (obj, intersect) => config.onClick(obj, intersect)
            : (obj, intersect) => standardClick(scene, obj, intersect);

        const handleContinuousHover = config.onHover
            ? (obj) => config.onHover(obj)
            : null;

        RAYCAST.addRaycastObject(
            scene,
            object,
            {
                onMouseEnter: handleEnter,
                onMouseLeave: handleLeave,
                onMouseDown: handleClick,
                onMouseHover: handleContinuousHover
            }
        );
    });

    // 6. Handle Books (Use Standard Defaults)
    BOOKS.forEach((book) => {
        RAYCAST.addRaycastObject(
            scene,
            book,
            {
                onMouseEnter: () => {
                    standardEnter(scene, book);
                    if (scene.gazeFollower) scene.gazeFollower.lookAtTarget(book)
                    setInformerBg(scene, B64.punch, "Inspect Book");
                },
                onMouseLeave: () => {
                    standardLeave(scene);
                    hideInformer(scene)
                    if (scene.gazeFollower) scene.gazeFollower.lookAtTarget(scene.camera)
                },
                onMouseDown: (obj, intersect) => standardClick(scene, obj, intersect)
            }
        );
    });

    // 7. Handle Blockers (Restored)
    // These objects block the ray but trigger NO functions (empty callbacks), and also not trigger onMouseEnter event
    RAY_BLOCKERS.forEach((name) => {
        const object = objectMap.get(name);
        if (object) {
            RAYCAST.addRaycastObject(
                scene,
                object,
                {
                    onMouseEnter: () => { },
                    onMouseLeave: () => { }
                }
            );
        }
    });
}

// =========================================================
// CONFIGURATION (Logic Map)
// =========================================================

const getInteractionConfig = (scene, objectMap, stats) => {
    // Dependencies
    const pokeball = objectMap.get("pokeball");
    const blackCat = objectMap.get("Object_12001");
    const whiteCat = objectMap.get("Object_108");
    const drone = objectMap.get('drone');

    // State for Gravity Well
    let gravityAnimFrame = null;
    let gravityStartTime = 0;

    return {
        // --- SPECIAL GROUP: Uses changeMaterial (Cats & Pokeball) ---
        "Object_12001": { // Black Cat
            onEnter: (obj) => RAYCAST.changeMaterial(obj), // Custom: Change Material
            onLeave: () => RAYCAST.restoreMaterials(scene),
            onClick: (clickedObj, intersect) => {
                standardClick(scene, clickedObj, intersect);
                catchTarget(scene, pokeball, blackCat, stats.gravityCenter, stats.tgtPos, stats.tgtQuat);
            }
        },
        "Object_108": { // White Cat
            onEnter: (obj) => RAYCAST.changeMaterial(obj), // Custom: Change Material
            onLeave: () => RAYCAST.restoreMaterials(scene),
            onClick: (clickedObj, intersect) => {
                standardClick(scene, clickedObj, intersect);
                catchTarget(scene, pokeball, whiteCat, stats.gravityCenter, stats.tgtPos, stats.tgtQuat);
            }
        },
        "pokeball": {
            onEnter: (obj) => RAYCAST.changeMaterial(obj), // Custom: Change Material
            onLeave: () => RAYCAST.restoreMaterials(scene),
            onClick: (clickedObj, intersect) => {
                standardClick(scene, clickedObj, intersect);
                const potentialTargets = [whiteCat, blackCat];
                const targetsToCatch = potentialTargets.filter(t => t && t.visible);
                if (targetsToCatch.length > 0) {
                    catchTarget(scene, pokeball, targetsToCatch, stats.gravityCenter, stats.tgtPos, stats.tgtQuat);
                }
            }
        },

        // --- COMPLEX GROUP: Uses Highlight (Default) + Extra Logic ---
        "Object_2001": { // Chair
            onEnter: (obj) => {
                setInformerBg(scene, B64.punch, "Push Chair");
                standardEnter(scene, obj); // Use standard highlight
            },
            onLeave: () => {
                hideInformer(scene);
                standardLeave(scene);
            },
            onClick: (clickedObj, intersect) => standardClick(scene, clickedObj, intersect)
        },
        "Lathe_Center": { //Blackhole
            onEnter: () => {
                setInformerBg(scene, B64.blackhole, "Gravity Well in 3...");

                if (gravityAnimFrame) cancelAnimationFrame(gravityAnimFrame);
                gravityStartTime = performance.now();

                const DURATION = 3000;
                let lastSecond = 3;
                let currentRotation = 0;

                const animateGravity = (time) => {
                    const elapsed = time - gravityStartTime;
                    const progress = Math.min(elapsed / DURATION, 1.0); // 0 to 1
                    const remaining = Math.max(0, 3 - Math.floor(elapsed / 1000));

                    // 1. Text Update (Countdown + Blinking Dots)
                    if (remaining > 0) {
                        // Dot blinks: 0-0.25: ., 0.25-0.5: .., 0.5-0.75: ..., 0.75-1: .
                        const subSecond = (elapsed % 1000) / 1000;
                        let dots = ".";
                        if (subSecond > 0.33) dots = "..";
                        if (subSecond > 0.66) dots = "...";

                        // Update text only if needed (optimization)
                        if (scene.cursorInformerText) {
                            scene.cursorInformerText.textContent = `Gravity Well in ${remaining}${dots}`;
                        }
                    } else if (progress >= 1.0) {
                        // Done
                        if (scene.cursorInformerText) {
                            scene.cursorInformerText.textContent = "Gravity Well ACTIVE";
                        }
                        switchPointGravityOnBH(scene, true);
                        gravityAnimFrame = null;
                        return; // Stop loop
                    }

                    // 2. Spinning Icon (Accelerates)
                    // Speed factor increases with progress.
                    // Base speed + (max speed * easeIn(progress))
                    const speed = 1 + (progress * progress * 20); // 1 deg/frame to 21 deg/frame
                    currentRotation += speed;

                    if (scene.cursorInformer) {
                        scene.cursorInformer.style.transform = `rotate(${currentRotation}deg)`;
                    }

                    gravityAnimFrame = requestAnimationFrame(animateGravity);
                };

                gravityAnimFrame = requestAnimationFrame(animateGravity);
            },
            onLeave: () => {
                if (gravityAnimFrame) {
                    cancelAnimationFrame(gravityAnimFrame);
                    gravityAnimFrame = null;
                }
                // Reset rotation
                if (scene.cursorInformer) {
                    scene.cursorInformer.style.transform = `rotate(0deg)`;
                }

                switchPointGravityOnBH(scene, false);
                hideInformer(scene);
            },
            onClick: () => {
                // Instantly Activate
                if (gravityAnimFrame) {
                    cancelAnimationFrame(gravityAnimFrame);
                    gravityAnimFrame = null;
                }

                if (scene.cursorInformerText) {
                    scene.cursorInformerText.textContent = "Gravity Well ACTIVE";
                }

                switchPointGravityOnBH(scene, true);

                // Optional: Legacy check if needed, but prioritizing user request
                let dist = RAYCAST.adjustNebula(scene);
                // if (dist < 0.05) activateBH(scene, scene.bhTargets); 
            },
            onHover: () => {
                // Just visual update
                let dist = RAYCAST.adjustNebula(scene);
            },
        },
        "planeSky": {
            onEnter: () => setInformerBg(scene, B64.lightning, "Call Lightning"),
            onLeave: () => hideInformer(scene),
            onClick: (clickedObj, intersect) => {
                const worldPoint = intersect.point.clone();
                const localPoint = clickedObj.worldToLocal(worldPoint);
                const normalizedStrikePos = new THREE.Vector2(2 * localPoint.x, 2 * localPoint.y);
                LIGHT.lightningStrike({
                    scene: scene,
                    constantUniform: scene.constantUniform,
                    windowLight: scene.windowLight
                }, 2, normalizedStrikePos, false);
                console.log('strikePos', normalizedStrikePos);
            }
        },
        "glassInvi": {
            onEnter: (obj) => {
                setInformerBg(scene, B64.slide, "Slide Door");
                standardEnter(scene, obj); // Use standard highlight

            },
            onLeave: () => {
                hideInformer(scene);
                standardLeave(scene);
                scene.constantUniform.uRimCenter.value.set(-1, -1)
            },
            onClick: (obj) => slideGlassAnimation(scene),
            onHover: () => {
                // console.log('intersection', scene.raycasterWrapper.currentIntersection.uv)
                const uv = scene.raycasterWrapper.currentIntersection.uv
                scene.constantUniform.uRimCenter.value.set(uv.x, uv.y)
            }
        },
        "mjolnir_low_mjolnir_hammer_0": {
            onEnter: (obj) => {
                setInformerBg(scene, B64.lightning, "Call Lightning");
                standardEnter(scene, obj);
            },
            onLeave: () => {
                hideInformer(scene);
                standardLeave(scene);
            },
            onClick: (clickedObj, intersect) => {
                standardClick(scene, clickedObj, intersect, 8)
                LIGHT.lightningStrike({
                    scene: scene,
                    constantUniform: scene.constantUniform,
                    windowLight: scene.windowLight
                }, 0.96, null, false);
            }
        },
        "bulb": {
            onEnter: (obj) => {
                setInformerBg(scene, B64.bulb, "Toggle Bulb");
                // standardEnter(scene, obj);
                // tweenBulb(scene, "#9cc1f2", 3000);
            },
            onLeave: () => {
                hideInformer(scene);
                // standardLeave(scene);
                // tweenBulb(scene, "#ffe0b2", 3000);
            },
            onClick: (clickedObj, intersect) => {
                // Toggle between Blue and Gold
                tweenBulb(scene, null, 1000);
            }
        },
        "shelf": {},
    };
};

// =========================================================
// UTILITY FUNCTIONS
// =========================================================

function catchTarget(scene, catcher, targets, gravityCenter, tgtPos, tgtQuat) {
    if (scene.isSucking) return;
    let targetList = Array.isArray(targets) ? targets : [targets];
    scene.world.hasPointGravityOnPokeball = false;
    jumpCatcher(scene, catcher, gravityCenter);
    startCatchingTweens(scene, catcher, targetList, tgtPos, tgtQuat);
}

function jumpCatcher(scene, catcher, gravityCenter) {
    let body = catcher.rapierBody;
    if (body.rapierShape.shape.type === 1) return;
    scene.world.pokeballBody = body;
    scene.world.gravityCenterForPokeball = gravityCenter;

    const forceDirection = catcher.position.clone();
    forceDirection.normalize();

    const mass = body.mass();
    const forceMultiplier = Math.random() * 1 + 1.5;
    const forceMagnitude = mass * forceMultiplier;
    const impulse = forceDirection.multiplyScalar(forceMagnitude * -1);

    impulse.y = Math.max(2 * Math.abs(forceDirection.y), 2);
    impulse.x /= getRandomFloat(2, 5);
    impulse.y *= getRandomFloat(2, 5);
    impulse.z /= getRandomFloat(2, 5);

    catcher.rapierBody.applyImpulse(impulse, true);
}

function startCatchingTweens(scene, catcher, targets, tgtPos, tgtQuat) {
    scene.isSucking = true;
    const mat = CONSTANTS.createInnerGlowMatSkinnedCatching("#FBC189", 1.5, 1);

    let contacts = []; // Ensure contacts is defined/cleared if used globally

    targets.forEach((target) => {
        target.ignoreRaycast = true;

        let startPos = new THREE.Vector3();
        let startQuat = new THREE.Quaternion();

        // Progress object for the tween
        let progress = { value: 0 };
        const DURATION = 1000;

        // Prepare Sucking Tween (Runs AFTER catch)
        const tweenSucking = new TWEEN.Tween(mat.uniforms.uprogress)
            .to({ value: 2 }, 1500)
            .easing(TWEEN.Easing.Bounce.Out)
            .onComplete(() => {
                scene.world.hasPointGravityOnPokeball = false;
                catcher.rapierBody.setBodyType(0);
                let force = new THREE.Vector3(0, -4, 0);
                catcher.rapierBody.applyImpulse(force, true);

                if (target.rapierBody) scene.world.removeCollider(target.rapierBody, true);

                target.visible = false;
                scene.isSucking = false;
            });

        // Combined Move & Rotate Switch
        const catchTween = new TWEEN.Tween(progress)
            .to({ value: 1 }, DURATION)
            .easing(TWEEN.Easing.Back.InOut)
            .onStart(() => {
                catcher.rapierBody.setBodyType(1);
                // Capture start state
                startPos.copy(catcher.position);
                startQuat.copy(catcher.rotation);
            })
            .onUpdate(() => {
                // Interpolate Position
                const currentPos = new THREE.Vector3().lerpVectors(startPos, tgtPos, progress.value);
                catcher.rapierBody.setTranslation(currentPos, false);

                // Interpolate Rotation
                const currentQuat = startQuat.clone().slerp(tgtQuat, progress.value);
                catcher.rapierBody.setRotation(currentQuat, false);
            })
            .onComplete(() => {
                mat.uniforms.catchPoint.value.copy(tgtPos);
                target.traverse((child) => {
                    if (child.isMesh) {
                        child.material = mat;
                        child.userData.originalMaterial = mat;
                    }
                });
            })
            .chain(tweenSucking);

        setTimeout(() => { scene.world.hasPointGravityOnPokeball = true; }, 1000);
        setTimeout(() => {
            catchTween.start();
        }, 3000);
    });
}

// Refactored to allow forcing a specific X position (e.g., 0.75)
// Refactored to allow forcing a specific X position (e.g., 0.75)
export function slideGlassAnimation(scene, forcedX = null, environmentRatio = null) {
    const obj = scene.getObjectByName('glassInvi');
    if (!obj) return;

    const SLIDE_LEFTX = 5.4;
    const SLIDE_RIGHTX = 0.75; // The user wants to "slide it to 0.75"

    let kinematicBodyFrame = obj.rapierBody;
    const currentPosition = kinematicBodyFrame.translation();
    const startPosX = currentPosition.x;

    // Determine direction
    let slideDirection;
    if (forcedX !== null) {
        // forcedX is now treated as a PERCENTAGE (0.0 to 1.0)
        // 0.0 = SLIDE_RIGHTX (0.75), 1.0 = SLIDE_LEFTX (5.4)

        // Decide direction based on whether the percentage is "more open" (> 0.5) or "more closed"
        slideDirection = (forcedX > 0.5) ? 1 : -1;
    } else {
        // Toggle if no force value provided
        slideDirection = obj.slideDirection ? obj.slideDirection * -1 : 1;
    }

    // Helper for linear interpolation
    const lerp = (start, end, t) => start + (end - start) * t;

    // Determine target percentage for toggle case
    let targetPercentage;
    if (forcedX !== null) {
        targetPercentage = forcedX;
    } else {
        // If toggling: Moving Left(Open) -> 0.0, Moving Right(Closed) -> 1.0
        // Original: Left was 1.0. Now Left is 0.0.
        // If direction is 1 (Left), pct = 0.0. If -1 (Right), pct = 1.0.
        targetPercentage = (slideDirection === 1) ? 0.0 : 1.0;
    }

    // New MAPPING: 0.0 = Open (Left, 5.4), 1.0 = Closed (Right, 0.75)
    // Position: 5.4 -> 0.75
    let targetPosX = (forcedX !== null)
        ? lerp(SLIDE_LEFTX, SLIDE_RIGHTX, targetPercentage)
        : (slideDirection === 1 ? SLIDE_LEFTX : SLIDE_RIGHTX);


    // Floor Rotation & Intensity Logic
    let floorMat = null;
    let startRotX = 0;
    let targetRotX = 0;
    let startIntensity = 0;
    let targetIntensity = 0;

    // Chair variables
    let chairMat = null;
    let startChairIntensity = 0;
    let targetChairIntensity = 0;

    // Use environmentUtils if provided, otherwise default to the physical target percentage
    const envRatio = (environmentRatio !== null) ? environmentRatio : targetPercentage;

    // Scene Env Intensity Logic
    let startEnvIntensity = scene ? (scene.environmentIntensity ?? 1) : 1;
    // Env: 0.0 (Open) -> 1.0 (Closed)
    // At pct 0.75 -> 0.75 intensity.
    let targetEnvIntensity = lerp(0.0, 1.0, envRatio);

    let blackCatMat = null;
    let startBlackCatIntensity = 0;
    let targetBlackCatIntensity = 0;

    if (scene) {
        const floor = scene.getObjectByName('floor');
        const chair = scene.getObjectByName('Object_0003_3');
        const blackCat = scene.getObjectByName('Object_12001');
        if (floor && floor.material) {
            floorMat = floor.material;
            // Check for rotation property presence
            if (floorMat.envMapRotation) {
                startRotX = floorMat.envMapRotation.x;
                // Rot: 2.07 (Open) -> 1.91 (Closed)
                targetRotX = lerp(2.07, 1.91, envRatio);
            }

            // Check for intensity property presence (or assume standard material has it)
            if (floorMat.envMapIntensity !== undefined) {
                startIntensity = floorMat.envMapIntensity;
                // Intensity: 0.1 (Open) -> 0.4 (Closed)
                targetIntensity = lerp(0.1, 0.4, envRatio);
            }
        }

        // Chair Logic
        if (chair && chair.material) {
            chairMat = chair.material;
            if (chairMat.envMapIntensity !== undefined) {
                startChairIntensity = chairMat.envMapIntensity;
                // Chair: 0.7 (Open) -> 1.7 (Closed)
                targetChairIntensity = lerp(0.7, 1.7, envRatio);
            }
        }

        // Black Cat Logic
        if (blackCat && blackCat.material) {
            blackCatMat = blackCat.material;
            if (blackCatMat.envMapIntensity !== undefined) {
                startBlackCatIntensity = blackCatMat.envMapIntensity;
                // Black Cat: 0.0 (Open) -> 1.2 (Closed)
                targetBlackCatIntensity = lerp(0.0, 1.2, envRatio);
            }
        }
    }

    let progress = { value: 0 };
    // console.log(scene)
    new TWEEN.Tween(progress)
        .to({ value: 1 }, 1000)
        .easing(TWEEN.Easing.Back.InOut)
        .onUpdate(() => {
            kinematicBodyFrame.setNextKinematicTranslation({
                x: startPosX + (targetPosX - startPosX) * progress.value,
                y: currentPosition.y,
                z: currentPosition.z
            });

            if (scene) {
                scene.environmentIntensity = startEnvIntensity + (targetEnvIntensity - startEnvIntensity) * progress.value;
            }

            if (floorMat) {
                if (floorMat.envMapRotation) {
                    floorMat.envMapRotation.x = startRotX + (targetRotX - startRotX) * progress.value;
                }
                if (floorMat.envMapIntensity !== undefined) {
                    floorMat.envMapIntensity = startIntensity + (targetIntensity - startIntensity) * progress.value;
                }
            }

            if (chairMat && chairMat.envMapIntensity !== undefined) {
                chairMat.envMapIntensity = startChairIntensity + (targetChairIntensity - startChairIntensity) * progress.value;
            }
            if (blackCatMat && blackCatMat.envMapIntensity !== undefined) {
                blackCatMat.envMapIntensity = startBlackCatIntensity + (targetBlackCatIntensity - startBlackCatIntensity) * progress.value;
            }
        })
        .onComplete(() => {
            obj.slideDirection = slideDirection;
        })
        .start();
}

function blackholeSuckTween(scene, targets) {
    if (scene.isSucking) return;
    scene.world.hasPointGravityOnBalls = false;
    scene.isSucking = true;
    let targetList = Array.isArray(targets) ? targets : [targets];
    const mat = CONSTANTS.createInnerGlowMatSkinnedCatching("#FBC189", 1.5, 1);
    mat.uniforms.catchPoint.value.copy(scene.getObjectByName('planeWall').position);

    setTimeout(() => {
        targetList.forEach((target) => {
            target.ignoreRaycast = true;
            let t = new TWEEN.Tween(mat.uniforms.uprogress)
                .to({ value: 2 }, 1500)
                .easing(TWEEN.Easing.Bounce.Out)
                .onStart(() => {
                    target.traverse((child) => {
                        if (child.isMesh) {
                            child.material = mat;
                            child.userData.originalMaterial = mat;
                        }
                    });
                })
                .onComplete(() => {
                    scene.world.hasPointGravityOnPokeball = false;
                    target.visible = false;
                });

            setTimeout(() => { t.start(); }, getRandomFloat(0, 100));
        });
    }, 2000);
}

function activateBH(scene, targets) {
    switchPointGravityOnBH(scene);
    setTimeout(() => {
        blackholeSuckTween(scene, targets);
    }, 1500);
}

function switchPointGravityOnBH(scene, val = true) {
    scene.world.hasPointGravityOnBH = val;
    if (val) scene.world.hasPointGravityOnBalls = false;
    scene.physicBodies.forEach((body) => { body.wakeUp(); });
}

function setInformerBg(scene, b64String, text = "INFO HERE") {
    // Set Image on the Icon (Rotatable element)
    scene.cursorInformer.style.backgroundImage = `url('data:image/svg+xml;base64,${b64String}')`;

    // Set Visibility on the Box (Stationary container)
    // Using display: flex to ensure layout calc only happens when shown
    if (scene.cursorInformerBox) {
        scene.cursorInformerBox.style.display = 'flex';
    }

    if (scene.cursorInformerText) {
        scene.cursorInformerText.textContent = text;
        scene.cursorInformerText.style.display = 'block';
    }

    document.body.style.cursor = 'pointer';
}

function hideInformer(scene) {
    if (scene.cursorInformerBox) {
        scene.cursorInformerBox.style.display = 'none';
    } else {
        // Fallback
        scene.cursorInformer.style.display = 'none';
    }

    if (scene.cursorInformerText) {
        scene.cursorInformerText.style.display = 'none';
    }
    document.body.style.cursor = 'auto';
}

function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

function tweenBulb(scene, forceColor = null, duration = 3000) {
    const COLOR_GOLD = new THREE.Color("#ffe0b2");
    const COLOR_BLUE = new THREE.Color("#9cc1f2");

    let targetColor;

    if (forceColor) {
        targetColor = new THREE.Color(forceColor);
    } else {
        // Toggle Logic
        // Check current state (using light color as reference)
        if (scene.bulbLight) {
            const currentColor = scene.bulbLight.color;
            // Calculate distance to Gold
            const distToGold = Math.abs(currentColor.r - COLOR_GOLD.r) + Math.abs(currentColor.g - COLOR_GOLD.g) + Math.abs(currentColor.b - COLOR_GOLD.b);

            // If closer to Gold, go Blue. Else go Gold.
            // Using a small threshold or just strict toggle logic.
            if (distToGold < 0.5) {
                targetColor = COLOR_BLUE;
            } else {
                targetColor = COLOR_GOLD;
            }
        } else {
            targetColor = COLOR_BLUE; // Default if no light found
        }
    }

    // 1. Bulb Light
    if (scene.bulbLight) {
        new TWEEN.Tween(scene.bulbLight.color)
            .to({ r: targetColor.r, g: targetColor.g, b: targetColor.b }, duration)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();
    }

    // 2. Bulb Material (Glow Color)
    if (scene.bulb && scene.bulb.material && scene.bulb.material.uniforms.glowColor) {
        new TWEEN.Tween(scene.bulb.material.uniforms.glowColor.value)
            .to({ r: targetColor.r, g: targetColor.g, b: targetColor.b }, duration)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();

        // 3. Bulb Aura (Child)
        const aura = scene.bulb.getObjectByName("bulbAura");
        if (aura && aura.material && aura.material.uniforms.glowColor) {
            new TWEEN.Tween(aura.material.uniforms.glowColor.value)
                .to({ r: targetColor.r, g: targetColor.g, b: targetColor.b }, duration)
                .easing(TWEEN.Easing.Cubic.Out)
                .start();
        }
    }
}
