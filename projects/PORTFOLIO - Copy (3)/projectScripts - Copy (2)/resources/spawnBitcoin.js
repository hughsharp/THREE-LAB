import * as THREE from 'three';
import * as RAYCAST from '../raycast/addRaycaster.js';
import RAPIER from '../rapierPhysics/rapier3d-compat.js';
import { bindBodyObject, getFreeFormBodyShapeFromMesh } from '../rapierPhysics/addRapierWorld.js';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';
import * as CONSTANTS from '../utils/constant.js';
import * as B64 from '../utils/base64Strings.js';
import * as DB from './addDragonBalls.js';
import { updateStory } from '../utils/status.js';
import { fetchTop10Cryptos } from '../utils/fetchCryptoData.js';

// Shared materials for Bitcoins (Lazy loaded)
let sharedBitcoinMat = null;
let sharedBitcoinAuraMat = null;

// Price Cache
let cryptoPrices = {};

// Initial Fetch (Non-blocking)
fetchTop10Cryptos().then(data => {
    data.forEach(coin => {
        cryptoPrices[coin.symbol.toLowerCase()] = coin.current_price;
    });
    console.log("Crypto Prices Cached:", cryptoPrices);
});

// Coin Management

// Coin Management
const activeCoins = [];
const inactiveBTC = [];
const inactiveETH = [];
const dyingCoins = [];
const MAX_COINS = 20; // Hard Limit (Mesh Pool)
const VISUAL_LIMIT = 10; // Soft Limit (Trigger Eviction)


function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

// --- Informer Helpers ---
// Use shared helpers from addRaycaster.js
const setInformerBg = (scene, b64, text) => {
    RAYCAST.setInformerBg(scene, b64, text);
    document.body.style.cursor = 'pointer';
};

const hideInformer = (scene) => {
    RAYCAST.hideInformer(scene);
    document.body.style.cursor = 'auto';
};


// Helper: Align Dragon Balls then Spawn Bitcoin
// Main Orchestrator for Bulb Click
export function alignDragonBallsAndDropBitcoin(scene, bulbObj) {
    // declare 2 object naming bulb and lathe_center
    let bulb = scene.getObjectByName("bulb");
    let latheCenter = scene.getObjectByName("Lathe_Center");
    let cases = [
        // create 2 objects here for name, spawnPos, impulse
        {
            name: "bulb",
            spawnPos: bulbObj.position.clone(),
            impulse: new THREE.Vector3(0.5, -1, 0)
        },
        {
            name: "Lathe_Center",
            spawnPos: new THREE.Vector3(-8.5, 7.25, -0.39),
            impulse: new THREE.Vector3(4.3 + Math.random() * 4, 2 + Math.random() * 3, 0)
        }
    ]

    // let spawnPos = bulbObj.position.clone();
    let alignPos = new THREE.Vector3(2 * (Math.random() + 2), 0.5, 0);
    // alignPos.y = 0.5;

    // // Default Impulse (Drop down)
    // const impulse = new THREE.Vector3(0.5, -1, 0); alignPos

    // we toss a random here to add randomness to spawnBitcoin by the cases
    let randomCase = Math.floor(Math.random() * cases.length);
    // let randomCase = 1
    let spawnPos = cases[randomCase].spawnPos;
    let impulse = cases[randomCase].impulse;

    updateStory("Summoning Dragon Balls...");
    alignDragonBalls(scene, alignPos, () => {
        // updateStory("A wild Coin appeared!");
        // spawnBitcoin is called below, let it handle the story to be specific
    });
    spawnBitcoin(scene, spawnPos, impulse);
}

// Reusable Alignment Logic
export function alignDragonBalls(scene, targetPosParam = null, onComplete = null) {
    // 1. Turn off point gravity if active
    DB.toggleGravityState(scene, false);

    setTimeout(() => {
        const balls = scene.dragonBalls || [];
        if (balls.length === 0) {
            if (onComplete) onComplete();
            return;
        }

        const count = balls.length;
        const radius = 0.6;

        let activeTweens = 0;

        balls.forEach((ball, index) => {
            if (!ball) return;

            // Capture Start Position
            const startPos = ball.position.clone();

            // Sleep physics
            if (ball.rapierBody) {
                ball.rapierBody.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased);
            }

            // Calculate Target
            let finalTargetPos;

            if (targetPosParam) {
                // If specific target passed, go there (or usage decision: collapse to point?)
                // User said: "add 1 optional param: targetPos if it is not passed, use current logic"
                // Assuming targetPos is the DESTINATION CENTER.
                // Let's keep the cluster formation but centered at targetPos?
                // Or just move ALL to targetPos?
                // "alignDragonball... targetPos" implies they might want to move them somewhere else.
                // I will assume they want to move them TO that position (collapse?) or center there.
                // Safest bet for "Align": Maintain formation but change center.

                const angle = (index / count) * Math.PI * 2;
                finalTargetPos = new THREE.Vector3(
                    targetPosParam.x + Math.cos(angle) * radius,
                    targetPosParam.y,
                    targetPosParam.z + Math.sin(angle) * radius
                );
            } else {
                // Current Logic: Circle at (0, 0.5, 0)
                const angle = (index / count) * Math.PI * 2;
                finalTargetPos = new THREE.Vector3(
                    0 + Math.cos(angle) * radius,
                    0.5,
                    0 + Math.sin(angle) * radius
                );
            }

            activeTweens++;

            // Proxy Object for Tweening
            const tweenObj = { t: 0 };

            new TWEEN.Tween(tweenObj)
                .to({ t: 1 }, 1000)
                .easing(TWEEN.Easing.Cubic.Out)
                .onUpdate(() => {
                    const currentPos = new THREE.Vector3().lerpVectors(startPos, finalTargetPos, tweenObj.t);

                    if (ball.rapierBody) {
                        ball.rapierBody.setNextKinematicTranslation(currentPos);
                    }
                })
                .onComplete(() => {
                    if (ball.rapierBody) {
                        ball.rapierBody.setBodyType(0); // Dynamic
                        ball.rapierBody.wakeUp(); // Explicit wake in case
                        ball.rapierBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
                        ball.rapierBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
                    }

                    activeTweens--;
                    if (activeTweens === 0) {
                        if (onComplete) onComplete();
                    }
                })
                .start();
        });

        // Fallback
        if (activeTweens === 0 && balls.length > 0) {
            if (onComplete) onComplete();
        }

    }, 500);
}


// --- COIN SPAWN ---
export function spawnBitcoin(scene, spawnLocation, impulse) {
    const scale = 0.5
    const btcSymbol = scene.getObjectByName("btc_symbol");
    // console.log(btcSymbol)
    const ethSymbol = scene.getObjectByName("eth_symbol"); // Assuming this exists
    // console.log(ethSymbol)

    if (!btcSymbol) {
        console.warn("btc_symbol not found in scene");
        return;
    }

    // Initialize shared materials if first run
    if (!sharedBitcoinMat) {
        // Use the NEW solid bitcoin material for the coin itself
        sharedBitcoinMat = CONSTANTS.createBitcoinMat();
        // Aura can still use the outer glow mat
        sharedBitcoinAuraMat = CONSTANTS.createOuterGlow(undefined, { oscillating: true, oscillationStrength: 1.0, isOscillating: 1.0 });
    }

    // 1. RANDOMIZE TYPE
    let type = "BTC";
    let template = btcSymbol;

    // 50/50 Chance if ETH exists
    if (ethSymbol && Math.random() > 0.5) {
        type = "ETH";
        template = ethSymbol;
    }

    let coin = null;
    let isReused = false;

    // 2. ENFORCE LIMITS
    // Soft Limit check -> Trigger eviction
    if (activeCoins.length >= VISUAL_LIMIT) {
        // Find oldest active coin to evict
        const victim = activeCoins.shift();
        if (victim) {
            evictCoin(victim);
        }
    }

    // Hard Limit check -> Force recycle immediately if we are totally full
    if (activeCoins.length + dyingCoins.length >= MAX_COINS) {
        // If we are here, we are desperate. Try to take from dying pool first.
        let recycled = dyingCoins.shift();

        if (!recycled && activeCoins.length > 0) {
            // Extremely rare case: All dying, or activeCoins full of non-evicted?
            // Just take oldest active
            recycled = activeCoins.shift();
        }

        if (recycled) {
            // Force cleanup of the recycled coin so it can be used below
            cleanupCoin(recycled);

            // Check type stuck on userData and push to pool so step 3 can find it
            if (recycled.userData.coinType === "ETH") {
                inactiveETH.push(recycled);
            } else {
                inactiveBTC.push(recycled);
            }
        }
    }

    // 3. TRY REUSE FROM POOL
    const pool = (type === "ETH") ? inactiveETH : inactiveBTC;
    if (pool.length > 0) {
        coin = pool.shift();
        isReused = true;
        coin.visible = true;
    } else {
        // Create NEW
        coin = template.clone();
        coin.name = `${type}_${performance.now()} `;
        coin.userData.coinType = type; // Mark type
        coin.material = sharedBitcoinMat;

        const aura = coin.clone();
        aura.name = "Aura";
        aura.material = sharedBitcoinAuraMat;
        aura.position.set(0, 0, 0);
        aura.rotation.set(0, 0, 0);
        aura.scale.setScalar(1.25);
        coin.add(aura);

        coin.scale.setScalar(scale); // Apply scale to mesh
        scene.add(coin);
    }

    // Add to end of active queue
    activeCoins.push(coin);

    // 4. RESET STATE (Position & Rotation)
    // Use passed spawnLocation (Vector3)
    if (spawnLocation) {
        coin.position.copy(spawnLocation);
    }

    coin.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);

    const originalScale = template.scale.clone();
    const targetScale = new THREE.Vector3(scale, scale, scale); // Target the desired scale

    // 5. PHYSICS & BLACKHOLE
    if (scene.world) {
        if (isReused && coin.rapierBody) {
            // Wake and Teleport existing body
            const body = coin.rapierBody;
            setTimeout(() => {
                if (scene.world.ballBodies && !scene.world.ballBodies.includes(body)) {
                    scene.world.ballBodies.push(body)
                }
            }, 3000);
            body.wakeUp();
            body.setTranslation({ x: spawnLocation.x, y: spawnLocation.y, z: spawnLocation.z }, true);
            body.setLinvel({ x: 0, y: 0, z: 0 }, true);
            body.setAngvel({ x: 0, y: 0, z: 0 }, true);

            // Apply Passed Impulse
            if (impulse) {
                body.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
            }
            body.applyTorqueImpulse({ x: Math.random(), y: Math.random(), z: Math.random() }, true);

        } else {
            // Create NEW Body
            const { body, shape } = getFreeFormBodyShapeFromMesh(scene, coin, {
                bodyType: 'dynamic',
                mass: 1.0,
                restitution: 0.5,
                friction: 0.5,
                canSleep: false,
                isConvexHull: true,
                isBhTarget: true // Note: Need to verify if helper pushes to bhTargets
            });

            // Manually ensure it's a BH target
            if (scene.bhTargets && !scene.bhTargets.includes(coin)) {
                scene.bhTargets.push(coin);
            }
            setTimeout(() => {
                if (scene.world.ballBodies && !scene.world.ballBodies.includes(body)) {
                    scene.world.ballBodies.push(body)
                }
            }, 3000);
            bindBodyObject(scene, coin, body, shape);


            // Apply Passed Impulse
            if (impulse) {
                body.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
            }
            body.applyTorqueImpulse({ x: Math.random(), y: Math.random(), z: Math.random() }, true);
        }
    }

    // 6. RAYCAST (Only needs to be added ONCE per object)
    if (!isReused) {
        // const label = (type === "ETH") ? "Push Ethereum" : "Push Bitcoin";
        RAYCAST.addRaycastObject(scene, coin, {
            onMouseEnter: (obj) => {
                // Determine Label (Price or Default)
                const price = cryptoPrices[type.toLowerCase()];
                let label = `Push ${type}`;

                if (price) {
                    // Format Price: $65,000 or $0.50
                    const formattedPrice = price.toLocaleString('en-US', {
                        style: 'currency',
                        currency: 'USD',
                        minimumFractionDigits: price < 1 ? 4 : 0,
                        maximumFractionDigits: price < 1 ? 4 : 0,
                    });
                    const now = new Date();
                    const formattedTime = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ', ' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                    label = `${type}: ${formattedPrice}<br>as of ${formattedTime} ${now.getFullYear()}`;
                }

                // Choose Icon
                const icon = (type === "ETH") ? B64.eth : B64.btc;

                // "Push" icon -> Now Coin Icon
                setInformerBg(scene, icon, label);
                RAYCAST.highlightObject(scene, obj);

                if (scene.gazeFollower) scene.gazeFollower.lookAtTarget(obj)
            },
            onMouseLeave: (obj) => {
                hideInformer(scene);

                if (scene.gazeFollower) scene.gazeFollower.lookAtTarget(scene.camera)
            },
            onMouseDown: (clickedObj, intersect) => {
                // Apply Force (Jump) using Raycaster helper
                RAYCAST.applyImpulse(scene, clickedObj, intersect, 5.0);
            }
        });
    }

    // Update Story with Coin Name
    updateStory(`A wild ${type === "BTC" ? "Bitcoin" : "Ethereum"} appeared!`);

    // 7. ANIMATION (Pop In + Oscillation)
    // Always restart the pop-in tween
    // Start at 0.1 of the TARGET scale
    coin.scale.copy(targetScale).multiplyScalar(0.1);

    const progress = { t: 0 };

    // Reset UserData for Oscillation
    coin.userData.oscStrength = 5;
    const auraObj = coin.getObjectByName("Aura");
    if (auraObj) auraObj.userData.oscStrength = 5;

    // Apply Uniform Overrides (Only needed once)
    if (!isReused) {
        const applyOscillationOverride = (mesh) => {
            mesh.onBeforeRender = function (renderer, scene, camera, geometry, material, group) {
                if (material.uniforms && material.uniforms.uOscillationStrength) {
                    this.userData.prevOsc = material.uniforms.uOscillationStrength.value;
                    material.uniforms.uOscillationStrength.value = this.userData.oscStrength;
                }
            };
            mesh.onAfterRender = function (renderer, scene, camera, geometry, material, group) {
                if (material.uniforms && material.uniforms.uOscillationStrength && this.userData.prevOsc !== undefined) {
                    material.uniforms.uOscillationStrength.value = this.userData.prevOsc;
                }
            };
        };
        applyOscillationOverride(coin);
        if (auraObj) applyOscillationOverride(auraObj);
    }

    new TWEEN.Tween(progress)
        .to({ t: 1 }, 5000)
        .easing(TWEEN.Easing.Cubic.Out)
        .onUpdate(() => {
            const t = progress.t;
            // Scale Tween
            coin.scale.lerpVectors(targetScale.clone().multiplyScalar(0.1), targetScale, t);

            // Oscillation Tween (5 -> 0)
            const currentOsc = 5 * (1 - t);
            coin.userData.oscStrength = currentOsc;
            if (auraObj) auraObj.userData.oscStrength = currentOsc;
        })
        .start();
}


// Helper: Evict Coin (Throw to Window)
export function evictCoin(coin) {
    dyingCoins.push(coin);

    if (coin.rapierBody) {
        // Ensure Dynamic
        coin.rapierBody.setBodyType(RAPIER.RigidBodyType.Dynamic);
        coin.rapierBody.wakeUp();

        // Calculate Direction to Window (6, 7, 8)
        const targetPos = new THREE.Vector3(6, 7, 8);
        const direction = new THREE.Vector3().subVectors(targetPos, coin.position).normalize();

        // Force Strength
        const force = 20.0;
        direction.multiplyScalar(force);

        // Apply Impulse
        coin.rapierBody.applyImpulse({ x: direction.x, y: direction.y, z: direction.z }, true);

        // Add random rotation
        coin.rapierBody.applyTorqueImpulse({
            x: Math.random(),
            y: Math.random(),
            z: Math.random()
        }, true);
    }

    // Cleanup after delay (simulate flight time)
    setTimeout(() => {
        cleanupCoin(coin);

        // Remove from dyingCoins array
        const idx = dyingCoins.indexOf(coin);
        if (idx > -1) dyingCoins.splice(idx, 1);

        // Return to pool
        if (coin.userData.coinType === "ETH") {
            inactiveETH.push(coin);
        } else {
            inactiveBTC.push(coin);
        }
    }, 2000);
}

// Helper: Force Cleanup Coin
export function cleanupCoin(coin) {
    if (scene.world.ballBodies && scene.world.ballBodies.includes(coin.rapierBody)) {
        // remove it from the array
        scene.world.ballBodies.splice(scene.world.ballBodies.indexOf(coin.rapierBody), 1);
    }
    coin.visible = false;
    if (coin.rapierBody) {
        // Reset to Dynamic (default state for pool) or Sleep
        // We sleep it far away
        coin.rapierBody.setBodyType(RAPIER.RigidBodyType.Dynamic);
        coin.rapierBody.setTranslation({ x: 0, y: -100, z: 0 }, true);
        coin.rapierBody.setLinvel({ x: 0, y: 0, z: 0 }, true);
        coin.rapierBody.setAngvel({ x: 0, y: 0, z: 0 }, true);
        coin.rapierBody.sleep();
    }
}
