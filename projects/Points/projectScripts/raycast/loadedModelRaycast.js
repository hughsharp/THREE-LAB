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
    // if (scene.gazeFollower) scene.gazeFollower.lookAtTarget(obj)
};

const standardLeave = (scene) => {
    RAYCAST.restoreMaterials(scene);
    // if (scene.gazeFollower) scene.gazeFollower.lookAtTarget(scene.camera)
};

const standardClick = (scene, clickedObject, intersection, forceMultiplier = null) => {
    forceMultiplier = forceMultiplier || Math.random() * 1 + 2.5;
    RAYCAST.applyImpulse(scene, clickedObject, intersection,forceMultiplier);
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
        const handleLeave= (obj) => {
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
            handleEnter,
            handleLeave,
            handleClick,
            handleContinuousHover
        );
    });

    // 6. Handle Books (Use Standard Defaults)
    BOOKS.forEach((book) => {
        RAYCAST.addRaycastObject(
            scene,
            book,
            () => {
                standardEnter(scene, book);
                if (scene.gazeFollower) scene.gazeFollower.lookAtTarget(book)
                setInformerBg(scene, B64.punch);
            }, // Uses highlight
            () => {
                standardLeave(scene);
                hideInformer(scene)
                if (scene.gazeFollower) scene.gazeFollower.lookAtTarget(scene.camera)
            }, // Uses highlight
            (obj, intersect) => standardClick(scene, obj, intersect)
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
                ()=>{}, // onEnter: Do nothing
                ()=>{}  // onLeave: Do nothing
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
                const potentialTargets = [whiteCat, blackCat, drone];
                const targetsToCatch = potentialTargets.filter(t => t && t.visible);
                if (targetsToCatch.length > 0) {
                    catchTarget(scene, pokeball, targetsToCatch, stats.gravityCenter, stats.tgtPos, stats.tgtQuat);
                }
            }
        },

        // --- COMPLEX GROUP: Uses Highlight (Default) + Extra Logic ---
        "Object_2001": { // Chair
            onEnter: (obj) => {
                setInformerBg(scene, B64.punch);
                standardEnter(scene, obj); // Use standard highlight
            },
            onLeave: () => {
                hideInformer(scene);
                standardLeave(scene);
            },
            onClick: (clickedObj, intersect) => standardClick(scene, clickedObj, intersect)
        },
        "planeWall": {
            onEnter: () => {
                let dist = RAYCAST.adjustNebula(scene);
                setInformerBg(scene, B64.blackhole);
                switchPointGravityOnBH(scene, dist < 0.05);
                // No highlight logic in original for wall, so we leave it just as BG change
            },
            onLeave: () => {
                switchPointGravityOnBH(scene, false);
                hideInformer(scene);
            },
            onClick: () => {
                let dist = RAYCAST.adjustNebula(scene);
                if (dist < 0.05) activateBH(scene, scene.bhTargets);
            },
            onHover: () => {
                let dist = RAYCAST.adjustNebula(scene);
                if (dist < 0.05) {
                    switchPointGravityOnBH(scene, true);
                } else {
                    switchPointGravityOnBH(scene, false);
                }
    },
        },
        "planeSky": {
            onEnter: () => setInformerBg(scene, B64.lightning),
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
            }
        },
        "glassInvi": {
            onEnter: (obj) => {
                setInformerBg(scene, B64.slide);
                standardEnter(scene, obj); // Use standard highlight
                
            },
            onLeave: () => {
                hideInformer(scene);
                standardLeave(scene);
                scene.constantUniform.uRimCenter.value.set(-1, -1)
            },
            onClick: (obj) => slideGlassAnimation(obj),
            onHover: ()=>{
                // console.log('intersection', scene.raycasterWrapper.currentIntersection.uv)
                const uv = scene.raycasterWrapper.currentIntersection.uv
                scene.constantUniform.uRimCenter.value.set(uv.x, uv.y)
            }
        },
        "mjolnir_low_mjolnir_hammer_0": {
            onEnter: (obj) => {
                
                setInformerBg(scene, B64.lightning); 
                standardEnter(scene, obj); 
            },
            onLeave: () => {
                hideInformer(scene);
                standardLeave(scene);
            },
            onClick: (clickedObj, intersect) => {
                // Your custom lightning logic
                standardClick(scene, clickedObj, intersect, 8)
                
                LIGHT.lightningStrike({
                    scene: scene,
                    constantUniform: scene.constantUniform,
                    windowLight: scene.windowLight
                }, 0.96, null,false);
                
            }
        },
        

    };
};

// =========================================================
// UTILITY FUNCTIONS
// =========================================================

function catchTarget(scene, catcher, targets, gravityCenter, tgtPos, tgtQuat){
    if (scene.isSucking) return;
    let targetList = Array.isArray(targets) ? targets : [targets];
    scene.world.hasPointGravityOnPokeball = false;
    jumpCatcher(scene, catcher, gravityCenter);
    startCatchingTweens(scene, catcher, targetList, tgtPos, tgtQuat);
}

function jumpCatcher(scene, catcher, gravityCenter){
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
    impulse.x /= getRandomFloat(2,5);
    impulse.y *= getRandomFloat(2,5);
    impulse.z /= getRandomFloat(2,5);
    
    catcher.rapierBody.applyImpulse(impulse, true);  
}

function startCatchingTweens(scene, catcher, targets, tgtPos, tgtQuat){
    scene.isSucking = true;
    const mat = CONSTANTS.createInnerGlowMatSkinnedCatching("#FBC189", 1.5, 1);
    targets.forEach((target)=>{
        target.ignoreRaycast = true;
        let srcPos  = new THREE.Vector3();
        let srcQuat = new THREE.Quaternion();
        const DURATION = 1000;

        const tweenQuat = new TWEEN.Tween(srcQuat)
            .to(tgtQuat, DURATION)
            .easing(TWEEN.Easing.Back.InOut)
            .onUpdate( ()=>{ catcher.rapierBody.setRotation(srcQuat, false); });

        const tweenPos = new TWEEN.Tween(srcPos)
            .to(tgtPos, DURATION)
            .easing(TWEEN.Easing.Back.InOut)
            .onStart(()=>{ catcher.rapierBody.setBodyType(1); })
            .onUpdate(()=>{ catcher.rapierBody.setTranslation(srcPos, false); })
            .onComplete(()=>{
                srcQuat.copy(catcher.rapierBody.rotation());
                mat.uniforms.catchPoint.value.copy(tgtPos);
                target.traverse((child) => {
                    if (child.isMesh){
                        child.material = mat;
                        child.userData.originalMaterial = mat;
                    }
                });
            });

        const tweenSucking = new TWEEN.Tween(mat.uniforms.uprogress)
            .to({value:2}, 1500)
            .easing(TWEEN.Easing.Bounce.Out)
            .onComplete(()=>{
                scene.world.hasPointGravityOnPokeball = false;
                catcher.rapierBody.setBodyType(0);
                let force = new THREE.Vector3(0,-4,0);
                catcher.rapierBody.applyImpulse(force, true);
                
                if(target.rapierBody) scene.world.removeCollider(target.rapierBody, true);
                
                target.visible = false;
                scene.isSucking = false;
            });

        setTimeout(() => { scene.world.hasPointGravityOnPokeball = true; }, 1000);
        setTimeout(() => {
            srcPos.copy(catcher.position);
            tweenQuat.chain(tweenSucking);
            tweenPos.chain(tweenQuat);      
            tweenPos.start();
        }, 3000);       
    });
}

function slideGlassAnimation(obj) {
    const SLIDE_LEFTX = 5.4;
    const SLIDE_RIGHTX = 0.75;
    
    let kinematicBodyFrame = obj.rapierBody;
    const currentPosition = kinematicBodyFrame.translation();
    
    let slideDirection = obj.slideDirection ? obj.slideDirection * -1 : 1;
    const startPosX = currentPosition.x;
    const targetPosX = slideDirection === 1 ? SLIDE_LEFTX : SLIDE_RIGHTX;
    let progress = { value: 0 };

    new TWEEN.Tween(progress)
        .to({ value: 1 }, 1000)
        .easing(TWEEN.Easing.Cubic.InOut)
        .onUpdate(() => {
            kinematicBodyFrame.setNextKinematicTranslation({
                x: startPosX + (targetPosX - startPosX) * progress.value,
                y: currentPosition.y,
                z: currentPosition.z
            });
        })
        .onComplete(() => {
            obj.slideDirection = slideDirection;
        })
        .start();
}

function blackholeSuckTween(scene, targets ){
    if (scene.isSucking) return;
    scene.world.hasPointGravityOnBalls = false;
    scene.isSucking = true;
    let targetList = Array.isArray(targets) ? targets : [targets];
    const mat = CONSTANTS.createInnerGlowMatSkinnedCatching("#FBC189", 1.5, 1);
    mat.uniforms.catchPoint.value.copy(scene.getObjectByName('planeWall').position);
    
    setTimeout(()=>{
        targetList.forEach((target)=>{
            target.ignoreRaycast = true;
            let t = new TWEEN.Tween(mat.uniforms.uprogress)
                .to({value:2}, 1500)
                .easing(TWEEN.Easing.Bounce.Out)
                .onStart(()=>{
                    target.traverse((child) => {
                        if (child.isMesh){
                            child.material = mat;
                            child.userData.originalMaterial = mat;
                        }
                    });
                })
                .onComplete(()=>{
                    scene.world.hasPointGravityOnPokeball = false;
                    target.visible = false;
                });
        
            setTimeout(()=>{ t.start(); }, getRandomFloat(0,100));
        });
    }, 2000);
}

function activateBH(scene, targets){
    switchPointGravityOnBH(scene);
    setTimeout(()=>{
        blackholeSuckTween(scene, targets);
    }, 1500);
}

function switchPointGravityOnBH(scene, val=true){
    scene.world.hasPointGravityOnBH = val;
    if (val) scene.world.hasPointGravityOnBalls = false;
    scene.physicBodies.forEach((body)=>{ body.wakeUp(); });
}

function setInformerBg(scene, b64String){
    scene.cursorInformer.style.backgroundImage = `url('data:image/svg+xml;base64,${b64String}')`;
    scene.cursorInformer.style.visibility = 'visible';
    document.body.style.cursor = 'pointer';
}

function hideInformer(scene){
    scene.cursorInformer.style.visibility = 'hidden';
    document.body.style.cursor = 'auto';
}

function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}


