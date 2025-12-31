import * as THREE from 'three';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';
import { textureLoader } from '../../configs/setupLoaders.js';
import { BasicGeometries } from '../../configs/setupGeometries.js';
import { constantUniform } from '../utils/addConstantUniform.js';
import { adjustWalls } from './adjustWalls.js';
import { addLights } from './addLights.js';
import { addBulb } from './addBulb.js';
import * as CONSTANTS from '../utils/constant.js';
import { addFireflies } from './addFireflies.js';
import * as ARAP from '../rapierPhysics/addRapierWorld.js';
import { loadedModelRaycast } from '../raycast/loadedModelRaycast.js';
// import { resources } from './loadResources.js';
import { adjustObjects } from './adjustObjects.js';
import { bindPhysics } from './bindPhysics.js';

// const GLB = 'gltf-compressed-MessyRoom58-c6.glb'; //scale up drone to x0.35
// const GLB = 'placeholderMat.glb'; //scale up drone to x0.35



const wallShaderMat = new THREE.ShaderMaterial({
    vertexShader: CONSTANTS.sineVertexShader,
    fragmentShader: CONSTANTS.nebulaHelixFS,
    transparent: true,
    uniforms: constantUniform,
    blending: THREE.AdditiveBlending,
    name: 'wallShaderMat'
});



const goldOuterGlowMat = CONSTANTS.createOuterGlow("#dcd0ba", { strength: 0.85, border: 0.03, p: 6.5 });
const goldInnerGlowMat = CONSTANTS.createInnerGlow("#dcd0ba", { power: 1.0, intensity: 1.0 });

// --- Helper Functions ---

function adjustBlackhole(scene) {
    let blackhole = scene.getObjectByName("Blackhole");
    if (!blackhole) return;

    blackhole.position.y = -500;
    blackhole.scale.setScalar(2);
    blackhole.traverse((child) => {
        if (child.isMesh && child.material) {
            child.material.roughness = 0.95;
            child.material.metalness = 0;
            child.material.side = THREE.FrontSide;
            child.castShadow = false;
            // child.material.needsUpdate = true;
        }
    });

    function setBHMatProp(name, property, value) {
        const child = blackhole.getObjectByName(name);
        if (child?.material && child.material[property] !== undefined) {
            child.material[property] = value;
        }
    }

    setBHMatProp("Lathe_L_Blackhole_03_0", "roughness", 0.4);
    setBHMatProp("Lathe_S_Blackhole_01_0", "metalness", 0.6);

    // let planeWall = new THREE.Mesh(BasicGeometries.plane);
    let lathe = blackhole.getObjectByName("Lathe_Center");

    if (lathe) lathe.material = wallShaderMat;

    // let scaleFactor = 3.5;
    // planeWall.scale.set(scaleFactor, scaleFactor, 1);
    // planeWall.rotation.set(0, Math.PI / 2, 0);
    // planeWall.position.set(-6.45, 7.1, -0.39);
    // planeWall.name = "planeWall";

    // scene.add(planeWall);
    // planeWall.visible = false;
    // addTweenData(planeWall, scene);
}


function addSky(scene) {
    const skyShaderMat = new THREE.ShaderMaterial({
        vertexShader: CONSTANTS.vertexShader,
        fragmentShader: CONSTANTS.stormFS,
        transparent: true,
        uniforms: constantUniform,
        blending: THREE.AdditiveBlending,
        side: THREE.BackSide
    });

    let planeSky = new THREE.Mesh(BasicGeometries.plane, skyShaderMat);
    scene.add(planeSky);
    planeSky.position.set(-55.00, -20.00, 30.00);
    planeSky.scale.setScalar(150);
    planeSky.name = "planeSky";
    addTweenData(planeSky, scene);

    let detector = new THREE.Object3D()
    scene.add(detector)
    detector.name = 'detector'
}

function adjustRainyGlass(scene) {
    // console.log(constantUniform)
    const rainyGlassShaderNoRimMat = new THREE.ShaderMaterial({
        vertexShader: CONSTANTS.vertexShader,
        fragmentShader: CONSTANTS.rainyGlassFS,
        transparent: true,
        uniforms: {
            iTime: constantUniform.iTime,
            rainGlassOpacity: constantUniform.rainGlassOpacity,
            iChannelX: constantUniform.iChannelX,
            uRimCenter: constantUniform.uRimCenter,
            glassRainAmount: constantUniform.glassRainAmount,

            hasRimOnGlass: { value: false }
        },
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide
    });

    const rainyGlassShaderWithRimMat = rainyGlassShaderNoRimMat.clone()

    //Adjust different uniforms

    // rainyGlassShaderWithRimMat.uniforms.uRainOffset.value = 15.5

    //relink shared uniform
    for (const key in rainyGlassShaderNoRimMat.uniforms) {
        rainyGlassShaderWithRimMat.uniforms[key] = constantUniform[key]
    }

    rainyGlassShaderWithRimMat.uniforms.hasRimOnGlass.value = true
    // rainyGlassShaderWithRimMat.uniforms.iTime = constantUniform.iTime
    // rainyGlassShaderWithRimMat.uniforms.rainGlassOpacity = constantUniform.rainGlassOpacity
    // rainyGlassShaderWithRimMat.uniforms.iChannelX = constantUniform.iChannelX
    // rainyGlassShaderWithRimMat.uniforms.uRimCenter = constantUniform.uRimCenter

    const g1 = scene.getObjectByName("glass1");
    const g2 = scene.getObjectByName("glass2");
    if (g1) g1.material = rainyGlassShaderWithRimMat;
    if (g2) g2.material = rainyGlassShaderNoRimMat;
}
// function addBulb(scene) {
//     const bulbMat = CONSTANTS.createInnerGlow(undefined, { oscillating: true, oscillationStrength: 1.0, isOscillating: 1.0 })
//     let bulb = new THREE.Mesh(BasicGeometries.sphere, bulbMat);
//     // let bulb = scene.getObjectByName("bulb");
//     bulb.material = bulbMat;
//     linkConstantUniforms(bulbMat, ['iTime', 'uOscillationStrength', 'uIsOscillating']);
//     scene.add(bulb);

//     // bulb.position.set(-2, 9.20, -0.30);
//     bulb.position.set(-9.20, 9.6, -0.39); //x:-9.20, y:7.25, z:-0.39
//     bulb.scale.setScalar(0);
//     bulb.name = "bulb";

//     let bulbAura = new THREE.Mesh(bulb.geometry, CONSTANTS.createOuterGlow(undefined, { oscillating: true, oscillationStrength: 1.0, isOscillating: 1.0 }));
//     // let bulbAura = bulb.clone()
//     bulbAura.material = CONSTANTS.createOuterGlow(undefined, { oscillating: true, oscillationStrength: 1.0, isOscillating: 1.0 });
//     linkConstantUniforms(bulbAura.material, ['iTime', 'uOscillationStrength', 'uIsOscillating']);
//     bulbAura.scale.setScalar(1.5);
//     bulbAura.name = "bulbAura";
//     bulb.add(bulbAura);


//     const bulbColor = new THREE.Color(0xffe0b2);
//     // const bulbIntensity = 800;
//     // const bulbDistance = 25;
//     const bulbIntensity = 0;
//     const bulbDistance = 0;
//     const bulbLight = new THREE.PointLight(bulbColor, bulbIntensity, bulbDistance);
//     bulbLight.name = "bulbLight";
//     // bulbLight.position.set(-2, 9.20, -0.30);
//     // scene.add(bulbLight);
//     bulb.add(bulbLight);
//     bulbLight.castShadow = true;

//     scene.bulb = bulb;
//     scene.bulbLight = bulbLight;
// }
function addBulb2(scene) {
    const bulbMat = CONSTANTS.createInnerGlow(undefined, { oscillating: true, oscillationStrength: 1.0, isOscillating: 1.0 })
    const bulbGeo = scene.getObjectByName("bulbSample").geometry.clone()
    console.log(bulbGeo)
    // let bulb = new THREE.Mesh(BasicGeometries.sphere, bulbMat);

    linkConstantUniforms(bulbMat, ['iTime', 'uOscillationStrength', 'uIsOscillating']);

    let bulb = new THREE.Mesh(bulbGeo, bulbMat);
    // console.log(bulbMat.uniforms)
    // bulb.material.wireframe = true;

    // --- MORPHING SETUP ---
    const btcSymbol = scene.getObjectByName("btc_symbol");
    let morphMat
    if (btcSymbol) {
        // 1. Clone Attributes
        if (btcSymbol.geometry.attributes.position) {
            bulbGeo.setAttribute('targetPosition', btcSymbol.geometry.attributes.position.clone());
        }
        if (btcSymbol.geometry.attributes.normal) {
            bulbGeo.setAttribute('targetNormal', btcSymbol.geometry.attributes.normal.clone());
        }

        // Store Indices for later manipulation
        bulb.userData.originalIndex = bulbGeo.index ? bulbGeo.index.clone() : null;
        bulb.userData.targetIndex = btcSymbol.geometry.index ? btcSymbol.geometry.index.clone() : null;

        // 2. Create Morph Material
        morphMat = new THREE.ShaderMaterial({
            uniforms: {
                iTime: constantUniform.iTime,
                uTransformProgress: { value: 0.0 }, // 0 = Bulb, 1 = Bitcoin
                uOscillationStrength: constantUniform.uOscillationStrength, // Re-use globally or set separate?
                uIsOscillating: constantUniform.uIsOscillating,

                // Fragment Uniforms
                glowColor: { value: new THREE.Color("#FBC189") },
                glowPower: { value: 1.0 },
                glowIntensity: { value: 1.0 }
            },
            vertexShader: CONSTANTS.vertexShaderMorph,
            fragmentShader: CONSTANTS.fragmentShaderInnerGlow,
            side: THREE.FrontSide,
            blending: THREE.AdditiveBlending,
            transparent: false,
            depthWrite: true
        });

        bulb.material = morphMat;
    } else {
        console.warn("btc_symbol not found for bulb morphing setup");
    }
    bulb.name = "bulb";
    scene.add(bulb);
    scene.bulb = bulb;


    // bulb.position.set(-2, 9.20, -0.30);
    bulb.position.set(-9.20, 9.6, -0.39); //x:-9.20, y:7.25, z:-0.39
    bulb.scale.setScalar(0);
    bulb.name = "bulb";

    let bulbAura = new THREE.Mesh(bulb.geometry, CONSTANTS.createOuterGlow(undefined, { oscillating: true, oscillationStrength: 1.0, isOscillating: 1.0 }));
    // let bulbAura = bulb.clone()
    bulbAura.material = morphMat;
    linkConstantUniforms(bulbAura.material, ['iTime', 'uOscillationStrength', 'uIsOscillating']);
    bulbAura.scale.setScalar(1.25);
    bulbAura.name = "bulbAura";
    bulb.add(bulbAura);


    const bulbColor = new THREE.Color(0xffe0b2);
    // const bulbIntensity = 800;
    // const bulbDistance = 25;
    const bulbIntensity = 0;
    const bulbDistance = 0;
    const bulbLight = new THREE.PointLight(bulbColor, bulbIntensity, bulbDistance);
    bulbLight.name = "bulbLight";
    // bulbLight.position.set(-2, 9.20, -0.30);
    // scene.add(bulbLight);
    bulb.add(bulbLight);
    bulbLight.castShadow = true;

    scene.bulb = bulb;
    scene.bulbLight = bulbLight;
}



function addTweenData(item, scene) {
    let parent = item.initialParent || item.parent;
    const itemData = {
        uuid: item.uuid,
        name: item.name,
        position: item.position.clone(),
        rotation: {
            x: item.rotation.x,
            y: item.rotation.y,
            z: item.rotation.z,
            order: item.rotation.order,
        },
        scale: item.scale.clone(),
        parent: parent
    };
    scene.tweenData = scene.tweenData || {};
    scene.tweenData[item.uuid] = itemData;
}

// --- Async Logic ---



function addMoon(scene, progressText) {
    if (progressText) progressText.innerText = "Loading Textures...";
    return new Promise((resolve) => {
        textureLoader.load("./textures/moonMed.jpg", (texture) => {
            let moon = new THREE.Mesh(BasicGeometries.sphere, new THREE.MeshBasicMaterial({ map: texture }));
            moon.name = "moon";
            scene.add(moon);
            moon.position.set(-420.00, 120.00, 205.00);
            moon.scale.setScalar(25);

            let moonInner = new THREE.Mesh(BasicGeometries.sphere, goldInnerGlowMat);
            moonInner.scale.setScalar(1.01);
            moon.add(moonInner);

            let moonOuter = new THREE.Mesh(BasicGeometries.sphere, goldOuterGlowMat);
            moonOuter.scale.setScalar(2.5);
            moon.add(moonOuter);

            addTweenData(moon, scene);
            resolve();
        });
    });
}


// --- Main Class ---

export class Model {
    constructor(scene, camera, renderer, resources) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.model = null;
        this.mixer = null;
        this.constantUniform = constantUniform;
        this.resources = resources;

    }

    async init(progressText, progressBar) {
        return new Promise(async (resolve, reject) => {
            // Use pre-loaded resource
            const gltf = this.resources.roomModel;

            if (!gltf) {
                const err = "Resources: Room Model not loaded.";
                console.error(err);
                if (progressText) progressText.innerText = err;
                reject(err);
                return;
            }

            try {
                if (progressText) progressText.innerText = "Initializing Scene...";

                // 1. Synchronous Setup
                const model = gltf.scene;
                this.model = model;
                this.scene.room = model;
                this.scene.animations = gltf.animations;

                // Shadows
                const receiveShadows = [
                    "leftWallFoot001", "Cube004", "shelf", "glass1", "Object_17",
                    "Object_1001_1", 'Object_8001', 'glass1', 'pillow-big-2',
                    'pillow-small-2', 'pillow-small-1', 'pillow-big-1', 'bedMain'
                ];
                const notCastShadows = ['Object_1001_1', 'Object_8001', "Object_17"];

                this.scene.add(model);

                model.getObjectByName('inviMesh').material.visible = false;

                model.traverse((child) => {
                    if (child.isMesh) {
                        child.material.side = THREE.FrontSide;
                        // child.material.needsUpdate = true;
                    }
                    if (receiveShadows.includes(child.name)) child.receiveShadow = true;
                    if (notCastShadows.includes(child.name)) child.castShadow = false;
                    else child.castShadow = true;

                    if (child.isMesh || child.getObjectByProperty('isSkinnedMesh', true)) {
                        addTweenData(child, this.scene);
                    }
                });

                let mixer = new THREE.AnimationMixer(model);
                this.mixer = mixer;
                this.scene.mixer = mixer;
                gltf.animations.forEach((clip) => {
                    this.mixer.clipAction(clip).play();
                });

                // Run Visual Helpers
                adjustWalls(this.scene);
                adjustBlackhole(this.scene);
                addSky(this.scene);
                adjustRainyGlass(this.scene);
                addLights(this.scene, constantUniform);
                addFireflies(this.scene, constantUniform);
                addBulb(this.scene);

                // 2. Asynchronous Setup (Sequential)
                // Load Materials (Uses loaded resources if avail)
                await adjustObjects(this.scene, progressText);

                // Load Textures
                // await addMoon(this.scene, progressText);

                // Setup Physics World (Create floor, etc)
                await bindPhysics(this.scene, progressText);

                // 3. Post-Physics Setup
                // addDragonBalls(this.scene);

                // Setup Raycaster
                loadedModelRaycast(this.scene);

                this.scene.constantUniform = constantUniform;

                if (progressText) progressText.innerText = "Compiling Shaders...";
                try {
                    await this.renderer.compileAsync(this.scene, this.camera);
                } catch (e) {
                    console.warn("Shader compilation warning:", e);
                }

                // Done! Resolve the promise.
                resolve();

            } catch (error) {
                console.error("Critical error during scene initialisation:", error);
                reject(error);
            }
        });
    }

    update(delta) {
        TWEEN.update();
        if (this.constantUniform) this.constantUniform.iTime.value += delta;
        if (this.mixer) this.mixer.update(delta);
    }
}


