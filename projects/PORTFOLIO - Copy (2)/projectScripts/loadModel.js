import * as THREE from 'three';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';
import { gltfLoader, textureLoader, rgbeLoader, dracoLoader } from '../configs/setupLoaders.js';
import { BasicGeometries } from '../configs/setupGeometries.js';
import { constantUniform } from './addConstantUniform.js';
import { adjustWalls } from './adjustWalls.js';
import { addLights } from './addLights.js';
import * as CONSTANTS from './constant.js';
import { addFireflies } from './addFireflies.js';
import { VanishEffect } from './vanishEffect.js';
import { addDragonBalls } from './addDragonBalls.js';
import * as ARAP from './addRapierWorld.js';
import { loadedModelRaycast } from './raycast/loadedModelRaycast.js';
import { addBTCRain } from './addBTCRain.js';

const GLB = 'MessyRoom54-c6.glb';

const wallShaderMat = new THREE.ShaderMaterial({
    vertexShader: CONSTANTS.sineVertexShader,
    fragmentShader: CONSTANTS.nebulaHelixFS,
    transparent: true,
    uniforms: constantUniform,
    blending: THREE.AdditiveBlending,
    name: 'wallShaderMat'
});



const goldOuterGlowMat = CONSTANTS.createOuterGlowMat("#dcd0ba", 0.85, 0.03, 6.5);
const goldInnerGlowMat = CONSTANTS.createInnerGlowMat("#dcd0ba", 1., 1);

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

    let planeWall = new THREE.Mesh(BasicGeometries.plane);
    let lathe = blackhole.getObjectByName("Lathe_Center");

    if (lathe) lathe.material = wallShaderMat;

    let scaleFactor = 3.5;
    planeWall.scale.set(scaleFactor, scaleFactor, 1);
    planeWall.rotation.set(0, Math.PI / 2, 0);
    planeWall.position.set(-6.45, 7.1, -0.39);
    planeWall.name = "planeWall";

    scene.add(planeWall);
    planeWall.visible = false;
    addTweenData(planeWall, scene);
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
}

function adjustRainyGlass(scene) {
    console.log(constantUniform)
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

function addBulb(scene) {
    const bulbColor = new THREE.Color(0xffe0b2);
    const bulbIntensity = 800;
    const bulbDistance = 25;
    const bulbLight = new THREE.PointLight(bulbColor, bulbIntensity, bulbDistance);
    bulbLight.name = "bulbLight";
    bulbLight.position.set(-2, 9.20, -0.30);
    scene.add(bulbLight);
    // bulbLight.castShadow = true;
}

function createToggleButton(vanishEffect) {
    const button = document.createElement('button');
    button.textContent = 'Toggle Effect';
    button.style.position = 'absolute';
    button.style.bottom = '20px';
    button.style.left = '20px';
    button.style.padding = '12px 24px';
    button.style.fontSize = '16px';
    button.style.fontFamily = 'Arial, sans-serif';
    button.style.backgroundColor = '#1a1a1a';
    button.style.color = 'white';
    button.style.border = '1px solid #333';
    button.style.borderRadius = '8px';
    button.style.cursor = 'pointer';
    button.style.zIndex = '10';
    document.body.appendChild(button);

    button.addEventListener('click', () => {
        vanishEffect.toggleAnimations();
    });
    return button;
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

// function 
function adjustObjects(scene, progressText) {
    if (progressText) progressText.innerText = "Configuring Materials...";

    return new Promise((resolve) => {
        // Inner Helper to apply logic once texture is ready
        const applyConfiguration = (envTexture) => {
            const objectMap = new Map();
            scene.traverse((obj) => {
                if (obj.name) objectMap.set(obj.name, obj);
            });

            const materialConfigs = [
                {
                    name: ["screenDisplay001_1"],
                    envMapIntensity: 10, metalness: 0.1, roughness: 0.5,
                    envMapRotation: new THREE.Euler(0, 0.5, 0.5)
                },
                { name: "Object_0003_3", envMapIntensity: 1, metalness: 0, roughness: 0.32, envMapRotation: new THREE.Euler(0, Math.PI / 2, 0) }, //CHAIR
                { name: "Object_0002", envMapIntensity: 3, metalness: 0, roughness: 0.1 },
                { name: "shelf", envMapIntensity: 1.65, metalness: 0., roughness: 1, envMapRotation: new THREE.Euler(1.2, 0.1, 0.2), side: THREE.BackSide, toneMapped: false },
                { name: "mjolnir_low_mjolnir_hammer_0", envMapIntensity: 5, metalness: 1, roughness: 1, },
                { name: "Object_15", envMapIntensity: 20, metalness: 0.15, roughness: 0.5, }, // DESK FACE
                { name: "Object_15001", envMapIntensity: 2, metalness: 0.15, roughness: 0.2, envMapRotation: new THREE.Euler(Math.PI, -Math.PI / 2, -1) }, // DESK STAND

                { name: "book001", envMapIntensity: 20, metalness: 0.15, roughness: 1, envMapRotation: new THREE.Euler(Math.PI / 2, Math.PI / 2, 0) },
                // { name: ["Object_12001", "Circle004_0"], envMapIntensity: 2.2 },
                { name: "Object_12001", envMapIntensity: 0.75, envMapRotation: new THREE.Euler(0, 1, 0), toneMapped: false },
                { name: "aegis", envMapIntensity: 5 },
                { name: "questionCube", envMapIntensity: 5, metalness: 0, roughness: 0 },
                { name: "Object_34001", envMapIntensity: 10, metalness: 0, roughness: 0.7, side: THREE.BackSide },
                { name: "Object_32", envMapIntensity: 2.5 },
                { name: "Object_31", envMapIntensity: 5, envMapRotation: new THREE.Euler(Math.PI, 0, 0) },
                { name: "Object_33", envMapIntensity: 2, envMapRotation: new THREE.Euler(Math.PI, 0, 0), roughness: 0 },
                { name: "Object_42001", envMapIntensity: 6 },
                { name: "Object_40001", envMapIntensity: 15, roughness: 0 },
                { name: "bedMain", envMapIntensity: 0.15, roughness: 1, envMapRotation: new THREE.Euler(Math.PI, Math.PI, Math.PI) },
                { name: "bedStand", envMapIntensity: 0.9, roughness: 1 },

                { name: "Object_0007", toneMapped: false },

                //Blackhole
                { name: "Lathe_S_Blackhole_01_0", toneMapped: false, emissiveIntensity: 0.7 },

                //DRONE PARTS
                { name: "Circle_0", envMapIntensity: 3.5, roughness: 0.1 },
                { name: "Cube_1", envMapIntensity: 1.5, roughness: 0.1 },
                { name: "Circle002_0", envMapIntensity: 6, roughness: 0.1 },
            ];

            materialConfigs.forEach(config => {
                const names = Array.isArray(config.name) ? config.name : [config.name];
                names.forEach(name => {
                    const obj = objectMap.get(name);
                    if (obj && obj.material) {
                        obj.material.envMap = envTexture;
                        // obj.material.needsUpdate = true;
                        const { name: _, ...props } = config;
                        Object.assign(obj.material, props);
                    }
                });
            });



            scene.isAdjusted = true;
            resolve();
        };

        // Fix Double HDR Load: Check if Main.js already loaded it
        if (scene.environment) {
            applyConfiguration(scene.environment);
        } else {
            rgbeLoader.load('textures/peppermint_powerplant_2_1k.hdr', (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                applyConfiguration(texture);
            });
        }
    });
}

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

function bindRapierToModelObjects(scene, progressText) {
    if (progressText) progressText.innerText = "Calculating Physics...";
    return new Promise((resolve, reject) => {
        scene.bhTargets ||= [];
        const objectMap = new Map();
        scene.traverse((obj) => { if (obj.name) objectMap.set(obj.name, obj); });

        function specifyBinding(names, func, options = {}) {
            const targets = Array.isArray(names) ? names : [names];
            for (let name of targets) {
                let m = objectMap.get(name);
                if (!m) continue;
                if (options.isBhTarget) scene.bhTargets.push(m);
                let bodyShape = func(scene, m, options);
                ARAP.bindBodyObject(scene, m, bodyShape.body, bodyShape.shape, options);
            }
        }

        specifyBinding([
            'backWall_rapier', 'rightWall', 'leftWall', 'glass2', 'frontWall',
            '', 'Object_15', 'Object_15001', 'Cube004', 'Cube019_3',
            'Cube019_5', "Object_1001_1", "bedMain", "bedStand", 'Object_8001'
        ], ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'fixed' });

        specifyBinding("glassInvi", ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'kinematicPosition' })

        specifyBinding('Object_31', ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', restitution: 0.2, mass: 50, pullingDampness: 0.5, canSleep: true, isBhTarget: true, isConvexHull: true }) //LAPTOP
        specifyBinding('pictureLionFrame', ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', restitution: 0.2, mass: 1, pullingDampness: 0.0025, canSleep: true, isBhTarget: true, isConvexHull: true }) //PICTURE FRAME
        specifyBinding('Model_0001', ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', restitution: 0.1, mass: 1.5, pullingDampness: 0.0025, canSleep: true, isBhTarget: true, isConvexHull: true }) //PICTURE FRAME 2



        // specifyBinding("caseCover", ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', mass: 400, restitution: 0.3, canSleep: true, isBhTarget: true,  pullingDampness: 0.25 }) // SHELF

        specifyBinding('Object_12001', ARAP.getBodyShapeByBoundingBox, { bodyType: 'fixed', scale: new THREE.Vector3(1, 1, 0.5), offset: new THREE.Vector3(0, 0.5, 0) }) //black cat

        specifyBinding('Object_108', ARAP.getBodyShapeByBoundingBox, { bodyType: 'kinematicPosition', scale: new THREE.Vector3(2, 1, 1) }) //whiteCat
        specifyBinding("Object_2001", ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', mass: 80, restitution: 0.3, canSleep: true, isBhTarget: true, yOffset: -0.1, pullingDampness: 0.75 }) // CHAIR
        specifyBinding("mjolnir_low_mjolnir_hammer_0", ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', mass: 10, restitution: 0.0, canSleep: true, isBhTarget: true, pullingDampness: 0.9075 }) // MJOLNIR
        specifyBinding('questionCube', ARAP.getBodyShapeByBoundingBox, { bodyType: 'dynamic', isBhTarget: true });
        specifyBinding("shelf", ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', mass: 400, restitution: 0.3, canSleep: true, isBhTarget: true, pullingDampness: 0.25 }) // SHELF

        let books = []
        for (let i = 0; i <= 38; i++) {
            const bookName = "book" + String(i).padStart(3, "0");
            books.push(bookName);
        }

        specifyBinding(books, ARAP.getBodyShapeByBoundingBox, { bodyType: 'dynamic', isBhTarget: true, mass: 2, restitution: 0.35, canSleep: true, pullingDampness: 0.25 });
        specifyBinding(['pokeball', 'pokeball2'], ARAP.getBodyShapeByBoundingSphere, { bodyType: 'dynamic', mass: 0.9, scale: 0.5, restitution: 0.8, isBhTarget: true });

        specifyBinding('drone', ARAP.getBodyShapeByBoundingBox, { bodyType: 'kinematicPosition', mass: 50.1, isBhTarget: true });

        setTimeout(() => {
            try {
                specifyBinding('caseCover', ARAP.getBodyShapeByBoundingBox, { bodyType: 'dynamic', mass: 100, restitution: 0.1, isBhTarget: true }) //PC case

                specifyBinding("Object_42001", ARAP.getBodyShapeByBoundingBox, { bodyType: 'dynamic', mass: 0.5, restitution: 0.93, canSleep: true, isBhTarget: true, pullingDampness: -1 }) //mouse

                specifyBinding("Object_38001", ARAP.getBodyShapeByBoundingBox, { bodyType: 'dynamic', mass: 0.5, restitution: 0.7, canSleep: true, isBhTarget: true, pullingDampness: 0 }) // keyboard

                specifyBinding('screenDisplay', ARAP.getBodyShapeByBoundingBox, { bodyType: 'dynamic', mass: 200, scale: new THREE.Vector3(1, 1.05, 1), offset: new THREE.Vector3(0, -0.13, 0), isBhTarget: true, pullingDampness: 0.6 }) //monitor

                specifyBinding(['aegis', 'aegis2'], ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', mass: 1.1, restitution: 0.01, canSleep: true, isBhTarget: true, isConvexHull: true });

                specifyBinding(['pillow-small-1', 'pillow-small-2', 'pillow-big-1', 'pillow-big-2'], ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', mass: 100.3, restitution: 0.0, friction: 0.9, canSleep: true, pullingDampness: 0.64, isBhTarget: true, isConvexHull: true });

                resolve();
            } catch (e) {
                reject(e);
            }
        }, 750);
    });
}

// --- Main Class ---

export class Model {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.model = null;
        this.mixer = null;
        this.constantUniform = constantUniform;

        // Init Vanish Effect immediately
        this.vanishEffect = new VanishEffect(scene);
        scene.vanishEffect = this.vanishEffect;
        createToggleButton(this.vanishEffect);
    }

    async init(progressText, progressBar) {
        return new Promise((resolve, reject) => {
            gltfLoader.setDRACOLoader(dracoLoader);
            gltfLoader.setPath('./models/');
            gltfLoader.load(
                GLB,
                async (gltf) => {
                    try {
                        if (progressText) progressText.innerText = "Initializing Scene...";

                        // 1. Synchronous Setup
                        const model = gltf.scene;
                        this.model = model;
                        this.scene.room = model;

                        // Shadows
                        const receiveShadows = [
                            "leftWallFoot001", "Cube004", "shelf", "glass1", "Object_17",
                            "Object_1001_1", 'Object_8001', 'glass1', 'pillow-big-2',
                            'pillow-small-2', 'pillow-small-1', 'pillow-big-1', 'bedMain'
                        ];
                        const notCastShadows = ['Object_1001_1', 'Object_8001', "Object_17"];

                        this.scene.add(model);

                        model.getObjectByName('inviMesh').material.visible = false;
                        // let m = new THREE.MeshStandardMaterial({color: '#FBC189'})

                        // model.getObjectByName('btc_symbol').material = m
                        // model.getObjectByName('coin_ring').material = CONSTANTS.goldOuterGlowMat
                        // model.getObjectByName('coin_core').material = CONSTANTS.goldOuterGlowMat




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

                        this.mixer = new THREE.AnimationMixer(model);
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
                        // Load Materials (Uses Main.js environment if avail)
                        await adjustObjects(this.scene, progressText);

                        // Load Textures
                        await addMoon(this.scene, progressText);

                        // Setup Physics World (Create floor, etc)
                        await bindRapierToModelObjects(this.scene, progressText);

                        // 3. Post-Physics Setup
                        // Safe to add balls now that Rapier World and Floor exist
                        addDragonBalls(this.scene);

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
                        console.error("Critical error during scene loading:", error);
                        reject(error);
                    }
                },
                (xhr) => {
                    if (xhr.lengthComputable) {
                        const percent = (xhr.loaded / xhr.total * 100).toFixed(0) + '%';
                        if (progressText && xhr.loaded < xhr.total) progressText.innerText = percent;
                        if (progressBar) progressBar.style.width = percent;
                    }
                },
                (error) => {
                    console.error('Error loading GLB', error);
                    reject(error);
                }
            );
        });
    }

    update(delta) {
        TWEEN.update();
        if (this.constantUniform) this.constantUniform.iTime.value += delta;
        if (this.mixer) this.mixer.update(delta);
    }
}


