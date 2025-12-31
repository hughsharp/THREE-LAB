import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';
import * as THREE from 'three';
import * as ARAP from '../addRapierWorld.js';

import * as GF from '../raycast/gazeFollower.js'

// --- CONSTANTS ---
const SPAWN_DISTANCE = 100; 
const SEQUENCE_DELAY = 200;  

// Timings
const MIN_DURATION = 1200; 
const MAX_DURATION = 2000;
const DURATION_EXTENT = 1.2;

const BOOK_START_DELAY = 100; 
const MIN_BOOK_DURATION = MIN_DURATION * DURATION_EXTENT; 
const MAX_BOOK_DURATION = MAX_DURATION * DURATION_EXTENT; 

// --- HIGH LEVEL HELPERS ---

export function initializeScenario(scene, orbitControl, clock) {
    clock.stop();
    if (orbitControl) orbitControl.update();

    const objectMap = createSceneMap(scene);
    prepareObjectsForEntry(scene, objectMap);
    deactivateRain(scene)
    return objectMap;
}

function deactivateRain(scene){
    const uniform = scene.constantUniform
    //sky rain
    uniform.isRaining.value = false
    uniform.uRainHeaviness.value = 0
    
    //glass rain
    uniform.glassRainAmount.value = 0
}
export async function assembleScene(scene, objectMap) {
    // Step A: Foundations
    await executeBuildStep(objectMap, "moon", 1500, SEQUENCE_DELAY, false);
    await executeBuildStep(objectMap, "floor", 1500, SEQUENCE_DELAY, false);
    await executeBuildStep(objectMap, "floor", 1500, SEQUENCE_DELAY, false);
    // Step B: The Contents (Furniture & Books) starts NOW
    const furnitureTask = tweenRemainingObjects(scene);

    // --- TWEAKED SECTION ---
    
    // SETTING: How far into the furniture animation should the black hole start?
    // 0.0 = Start immediately
    // 0.5 = Start when furniture is halfway done
    // 1.0 = Start when the fastest furniture lands
    const TIMING_RATIO = 0.4; 
    
    const calculatedDelay = MIN_DURATION * TIMING_RATIO;
    
    console.log(`Blackhole starting in ${calculatedDelay}ms`);
    await delay(calculatedDelay);

    // -----------------------

    // Step C: The Blackhole
    const blackhole = objectMap.get("blackholeScene");
    if (blackhole) {
        // Note: I increased the duration slightly to 3500 to make it look 'heavier'
        tweenBlackhole(blackhole, 3500); 
    }

    // Step D: Wait for everything to settle
    await furnitureTask;
}
// async function addDroneGravityPoint(scene) {
//     scene.rapierWrapper.addGravityPoint('drone')
// }

async function tweenRemainingObjects(scene) {
    const remainingObjects = getRemainingObjects(scene);
    
    const books = remainingObjects.filter(obj => /^book\d+$/.test(obj.name));
    const others = remainingObjects.filter(obj => !/^book\d+$/.test(obj.name));
    const easing = TWEEN.Easing.Back.Out;

    // 1. Swarm "Others"
    if (others.length > 0) {
        others.forEach((obj) => {
            const duration = getRandomDuration(MIN_DURATION, MAX_DURATION);
            tweenSpecificObject(obj, duration, false, easing); 
        });
    }

    // 2. Slide "Books"
    if (books.length > 0) {
        await delay(BOOK_START_DELAY);

        books.forEach((obj) => {
            const duration = getRandomDuration(MIN_BOOK_DURATION, MAX_BOOK_DURATION);
            tweenSpecificObject(obj, duration, true); 
        });
        
        await delay(MAX_BOOK_DURATION);
    } else {
        await delay(MAX_DURATION);
    }
}

export async function applyPhysics(scene, objectMap, clock) {
    const planeSky = objectMap.get("planeSky");
    if (planeSky) planeSky.visible = true; 

    objectMap.forEach((obj, name) => {
        if (/^dragonBall\d+Stars$/.test(name)) {
            obj.visible = true;
        }
    });

    clock.start();
    console.log("Clock Resumed.");

    if (scene.world) {
        scene.world.isActive = true;
        console.log("Physics Activated.");
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

function tweenBlackhole(obj, duration) {
    if (!obj.userData.originalPos || !obj.userData.originalScale || !obj.userData.originalRot) return;

    const easing = TWEEN.Easing.Cubic.Out;

    // 1. Create Position Tween
    const posTween = new TWEEN.Tween(obj.position)
        .to(obj.userData.originalPos, duration)
        .easing(easing);

    // 2. Create Scale Tween
    const scaleTween = new TWEEN.Tween(obj.scale)
        .to(obj.userData.originalScale, duration)
        .easing(TWEEN.Easing.Back.Out);

    // 3. Create Rotation Tween
    const rotTween = new TWEEN.Tween(obj.rotation)
        .to({ z: obj.userData.originalRot.z }, duration)
        .easing(TWEEN.Easing.Back.InOut);

    // 4. CHAIN: Start Scale & Rotation AFTER Position finishes
    posTween.chain(scaleTween, rotTween);
    
    // 5. START only the Position Tween
    posTween.start();
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
    const excludedNames = ["moon", "floor", "planeSky", "blackholeScene"];
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

export function handleUserEntry(scene) {
    return new Promise((resolve) => {
        const enterButton = document.getElementById('enter-button');
        const loadingContainer = document.getElementById('loading-container');
        const progressText = document.getElementById('progress-text');
        const progressBar = document.getElementById('progress-bar');

        if (progressText) progressText.innerText = "Ready";
        if (progressBar) progressBar.parentElement.style.display = 'none';

        if (enterButton) {
            enterButton.style.display = 'inline-block';
            enterButton.addEventListener('click', async () => {
                if (loadingContainer) {
                    loadingContainer.style.opacity = '0';
                    setTimeout(() => { loadingContainer.style.display = 'none'; }, 500);
                }
                resolve();
            }, { once: true });
        } else {
            resolve();
        }
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


// DRONE
export async function playDrone(scene) {
    const drone = scene.getObjectByName('drone');
    // const droneBody = drone.ra

    if (!drone) {
        console.error("Drone not found");
        return;
    }

    return new Promise((resolve) => {
        // --- 1. Define Path Points (Renamed) ---
        const startPoint = drone.position.clone();
        const midPoint   = new THREE.Vector3(9, 1, -1.3);
        const endPoint   = new THREE.Vector3(-1, 9, -5);

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
        const targetEuler = new THREE.Euler(-Math.PI/2, 0.2, 1.25);
        const endQuaternion = new THREE.Quaternion().setFromEuler(targetEuler);

        const tObj = { val: 0 }; 
        let quat = new THREE.Quaternion()
        new TWEEN.Tween(tObj)
            .to({ val: 1 }, 3000)
            .easing(TWEEN.Easing.Quadratic.InOut) 
            .onUpdate(() => {
                // --- 4. Update Loop ---
                
                // A. Update Position
                const point = curve.getPoint(tObj.val);
                drone.rapierBody.setNextKinematicTranslation(point)
                // drone.position.copy(point);
                
                // B. Update Rotation (SLERP)
                // Smoothly blend from startQuaternion to endQuaternion based on progress 'val'
                // quat.copy(startQuaternion).slerp(endQuaternion, tObj.val);
                // drone.rapierBody.setRotation(quat)
                drone.lookAt(scene.camera.position)
                quat.copy(drone.quaternion)
                drone.rapierBody.setRotation(quat)
            })
            .onComplete(() => {
                let gazeFollower = new GF.GazeFollower(drone)
                gazeFollower.init()
                scene.gazeFollower = gazeFollower
                resolve();
            })
            .start();
    });
}

// RAIN CONTROL
export function activateRain(scene){
    let rainStartTime = 8000
    let easing = TWEEN.Easing.Linear.None
    let glassRainTween = new TWEEN.Tween(scene.constantUniform.glassRainAmount).to({value: 1}, rainStartTime).easing(easing)

    new TWEEN.Tween(scene.constantUniform.uRainHeaviness)
        .to({value: 0.75}, rainStartTime)
        .easing(easing)
        .onStart( ()=>{
            scene.constantUniform.isRaining.value = true
            setTimeout( ()=>{
                glassRainTween.start()
            }, rainStartTime * 0.4)
        })
        .start()
}
