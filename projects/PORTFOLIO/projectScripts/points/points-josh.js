import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';
import * as UI from '../points-old/ui.js';
import * as Shader from './shaders-josh.js';
import * as PostProcessing from '../points-old/pointsPostprocessing.js';


// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

import { resources } from '../resources/loadResources.js';
import { linkConstantUniforms } from '../utils/addConstantUniform.js';

const POINT_CAP = 50000
const scatterRangeModel = 190;
const scatterRangeGrid = 300;
const POINT_SIZE = 0.05;
const GRID_SIZE = 60;
const DEFAULT_PIXEL_RATIO = 2.0;

const BASE_COLOR = '#ffffff';

const DEFAULT_VIBRATE_AMPLITUDE = 0.25;
const DEFAULT_SIZE_THRESHOLD = 18.0; // 12 for model (when morphed)
const MODEL_SIZE_THRESHOLD = 12.0;
const DEFAULT_VIBRATE_BOOST_SIZE_THRESHOLD = 50.0;

// Camera
const CAMERA_FOV = 45;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 300;
const CAMERA_POSITION = { x: 61.56, y: 2.97, z: 30 };

// Scene
const SCENE_BACKGROUND = '#000000'; // (Used if we set a clear color, but we use transparent)

// Renderer
const RENDERER_DPR_MAX = 2;


// Light defaults
const LIGHT_DIR_X = -100;
const LIGHT_DIR_Y = -100.0;
const LIGHT_DIR_Z = 100.7;
const LIGHT_STRENGTH = 1.0;
const LIGHT_SIZE_BOOST = 1.5;

// GRID
const gridZ = -40.0;
const gridSpacing = 2.;
const GAP_SIZE = 1;

// UI controls
const UI_WIDTH = '200px';
const UI_TOP = '20px';
const UI_RIGHT = '20px';
const MORPH_DURATION = 2500;

// Mouse interaction settings
const mouseDamping = { value: 0.15 };
const pointReturnSpeed = { value: 0.08 };

//model
const MODEL_INFO = [
    {
        "name": "manx",
        "baseColor": new THREE.Vector3(1, 1, 1),
        "brightness": 1.0
    },
    {
        "name": "heartx",
        "baseColor": new THREE.Vector3(0.984, 0.757, 0.537),
        "brightness": 1.65
    }
]

export default class Points {
    constructor(scene, camera, renderer, raycaster) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;

        // Postprocessing
        this.composer = null;
        this.bloomPass = null;

        // Objects & Raycasting
        this.points = null;
        this.material = null;
        // Unwrap if it's the custom Raycaster class from office.js
        this.raycaster = (raycaster && raycaster.raycaster) ? raycaster.raycaster : (raycaster || new THREE.Raycaster());
        this.intersectionPlane = null;
        // this.controls = null;

        // Mouse state
        this.mouse = new THREE.Vector2(10000, 10000);
        this.targetMouse = new THREE.Vector2(10000, 10000);
        this.smoothMouse = new THREE.Vector2(10000, 10000);
        this.smoothRepulsionMouse = new THREE.Vector2(10000, 10000);
        this.isFirstMouseMove = true;

        // Animation state
        this.clock = new THREE.Clock();
        this.speed = { value: 1. };
        this.hoverEffect = { radius: 200.0 };
        this.mixer = null; // Animation Mixer

        // Bind methods

        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);

        // Default point count
        this.pointCap = POINT_CAP

        // Initialize
        this.init();
    }

    init() {
        // Postprocessing
        this.initPostprocessing();

        // Controls (Attaching to the given renderer's element)
        // We assume the main app handles camera movement, but if we need local overrides:
        // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        // this.controls.enableDamping = true;

        // Intersection Plane (for raycasting depth)
        this.intersectionPlane = new THREE.Mesh(
            new THREE.PlaneGeometry(200, 200),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        this.scene.add(this.intersectionPlane);

        // Listeners
        window.addEventListener('mousemove', this.onMouseMove, false);
        window.addEventListener('mouseleave', this.onMouseLeave, false);
        window.addEventListener('resize', this.onWindowResize, false);

        // Create Loading UI
        this.createLandingOverlay();

        // Create Background Points immediately
        this.createBackgroundParticles();

        // Start Loading Model (Background)
        this.loadModel('Armature');
    }



    initPostprocessing() {
        const { composer, bloomPass } = PostProcessing.setupPostProcessing(this.renderer, this.scene, this.camera);
        this.composer = composer;
        this.bloomPass = bloomPass;
    }

    createStarTexture() {
        return resources.spriteSheet;
    }

    createLandingOverlay() {
        // Create container for Loading/Enter UI
        this.overlayContainer = document.createElement('div');
        Object.assign(this.overlayContainer.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', zIndex: '9999'
        });
        document.body.appendChild(this.overlayContainer);

        // Progress Text
        this.progressText = document.createElement('div');
        this.progressText.innerText = '0%';
        Object.assign(this.progressText.style, {
            color: 'white', fontSize: '24px', fontFamily: 'sans-serif', marginBottom: '20px'
        });
        this.overlayContainer.appendChild(this.progressText);

        // Progress Bar
        this.progressBarContainer = document.createElement('div');
        Object.assign(this.progressBarContainer.style, {
            width: '300px', height: '4px', background: 'rgba(255,255,255,0.2)', borderRadius: '2px', overflow: 'hidden'
        });
        this.progressBar = document.createElement('div');
        Object.assign(this.progressBar.style, {
            width: '0%', height: '100%', background: 'white', transition: 'width 0.1s linear'
        });
        this.progressBarContainer.appendChild(this.progressBar);
        this.overlayContainer.appendChild(this.progressBarContainer);

        // Enter Button (Hidden initially)
        this.enterBtn = document.createElement('button');
        this.enterBtn.innerText = 'ENTER';
        Object.assign(this.enterBtn.style, {
            marginTop: '30px', padding: '10px 40px', fontSize: '18px', letterSpacing: '2px',
            background: 'transparent', border: '1px solid white', color: 'white', cursor: 'pointer',
            pointerEvents: 'auto', display: 'none', fontFamily: 'sans-serif', textTransform: 'uppercase'
        });
        this.enterBtn.addEventListener('mouseenter', () => this.enterBtn.style.background = 'white', this.enterBtn.style.color = 'black');
        this.enterBtn.addEventListener('mouseleave', () => this.enterBtn.style.background = 'transparent', this.enterBtn.style.color = 'white');

        this.enterBtn.addEventListener('click', () => {
            console.log("Entering experience...");

            // Fade out overlay
            this.overlayContainer.style.transition = 'opacity 0.5s ease';
            this.overlayContainer.style.opacity = '0';
            setTimeout(() => {
                if (this.overlayContainer.parentNode) this.overlayContainer.parentNode.removeChild(this.overlayContainer);
            }, 500);

            // Trigger Morph Animation (Background -> Model)
            // This ensures the user sees something happening immediately
            new TWEEN.Tween(this.material.uniforms.uProgress)
                .to({ value: 1.0 }, MORPH_DURATION)
                .easing(TWEEN.Easing.Cubic.InOut)
                .start();

            // Also animate size threshold for smoother transition
            new TWEEN.Tween(this.material.uniforms.uSizeThreshold)
                .to({ value: MODEL_SIZE_THRESHOLD }, MORPH_DURATION)
                .easing(TWEEN.Easing.Cubic.InOut)
                .start();

            // Ensure mixer is playing and reset
            if (this.mixer) {
                this.mixer.timeScale = 1;
                // If we want to restart animations on enter:
                // this.mixer.stopAllAction();
                // resources.heroModel.animations.forEach(clip => this.mixer.clipAction(clip).reset().play());
            }

            // Show Main Control UI
            this.createControlUI();
        });

        this.overlayContainer.appendChild(this.enterBtn);
    }

    loadModel(rootName) {
        if (resources.heroModel) {
            const gltf = resources.heroModel;
            let mesh = null;
            let root = gltf.scene.getObjectByName(rootName);
            root.traverse((child) => {
                if (child.isMesh && !mesh) mesh = child;
            });

            if (mesh) {
                this.updateParticlesWithModel(root);
            }

            // Setup Animation Mixer
            if (gltf.animations && gltf.animations.length > 0) {
                console.log(`Found ${gltf.animations.length} animations`);
                this.mixer = new THREE.AnimationMixer(gltf.scene);
                gltf.animations.forEach(clip => this.mixer.clipAction(clip).play());
                this.animModelRoot = gltf.scene; // Store root for matrix updates
            } else {
                console.warn("No animations found in GLTF");
            }

            // Loading Complete
            this.progressText.innerText = '100%';
            this.progressBar.style.width = '100%';

            setTimeout(() => {
                this.progressText.style.display = 'none';
                this.progressBarContainer.style.display = 'none';
                this.enterBtn.style.display = 'block';
            }, 500);
        } else {
            console.error("Hero Model not found in resources");
        }
    }

    createBackgroundParticles() {
        const starTexture = this.createStarTexture();

        // Initialize Material with default uniforms
        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uSize: { value: POINT_SIZE },
                uColor: { value: new THREE.Color(BASE_COLOR) },
                uPixelRatio: { value: DEFAULT_PIXEL_RATIO },
                uLightDir: { value: new THREE.Vector3(LIGHT_DIR_X, LIGHT_DIR_Y, LIGHT_DIR_Z) },
                iTime: { value: 0.0 },
                uVibrateAmp: { value: DEFAULT_VIBRATE_AMPLITUDE },
                uProgress: { value: 0.0 }, // Start at scattered state
                uLightStrength: { value: LIGHT_STRENGTH },
                uLightSizeBoost: { value: LIGHT_SIZE_BOOST },
                uSizeThreshold: { value: DEFAULT_SIZE_THRESHOLD },
                uVibrateBoostSizeThreshold: { value: DEFAULT_VIBRATE_BOOST_SIZE_THRESHOLD },
                uStarTexture: { value: starTexture },
                uBaseRotateSpeed: { value: this.speed.value },
                uMousePos: { value: new THREE.Vector3(0, 0, 0) },
                uMouseNDC: { value: new THREE.Vector2(0, 0) },
                uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uHoverRadius: { value: this.hoverEffect.radius },
                uCols: { value: 8.0 },
                uRows: { value: 4.0 },
                uModelGapRadius: { value: 0.35 },
                uModelOffset: { value: new THREE.Vector2(0.2, 0) },
                uModelRotationY: { value: 0.0 },
                uModelRotationZ: { value: -Math.PI },
                uModelScale: { value: 0.5 }
            },
            vertexShader: Shader.vertexShader,
            fragmentShader: Shader.fragmentShader,
            transparent: true,
            transparent: true,
            depthWrite: false,
        });

        linkConstantUniforms(this.material, ['uModelRotationX', 'uModelRotationY', 'uModelRotationZ', 'uModelScale', 'uModelPosition']);

        // Create 100k points for background
        const count = this.pointCap;
        const randomPositions = new Float32Array(count * 3);
        const targetPositions = new Float32Array(count * 3); // Placeholders
        const sizes = new Float32Array(count);
        const isGrid = new Float32Array(count);
        const colors = new Float32Array(count * 3); // New Color Attribute
        const skinIndices = new Float32Array(count * 4);
        const skinWeights = new Float32Array(count * 4);

        // Grid/Scatter Logic
        const gridSide = Math.ceil(Math.sqrt(count)) || 1;
        const camPos = new THREE.Vector3(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);
        const target = new THREE.Vector3(0, 0, 0);
        const forward = new THREE.Vector3().subVectors(target, camPos).normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();
        const gridOrigin = forward.clone().multiplyScalar(-gridZ);
        const tempVec = new THREE.Vector3();
        const baseColorObj = new THREE.Color(BASE_COLOR);

        for (let i = 0; i < count; i++) {
            // Random scatter
            randomPositions[i * 3 + 0] = (Math.random() * 2.0 - 1.0) * scatterRangeGrid;
            randomPositions[i * 3 + 1] = (Math.random() * 2.0 - 1.0) * scatterRangeGrid;
            randomPositions[i * 3 + 2] = (Math.random() * 2.0 - 1.0) * scatterRangeGrid;

            // Calculate Grid Position (Target for background/scatter mode)
            const col = i % gridSide;
            const row = Math.floor(i / gridSide);
            const xOffset = (col - gridSide / 2) * gridSpacing;
            const yOffset = (row - gridSide / 2) * gridSpacing;

            tempVec.copy(gridOrigin)
                .addScaledVector(right, xOffset)
                .addScaledVector(up, yOffset);

            targetPositions[i * 3 + 0] = tempVec.x;
            targetPositions[i * 3 + 1] = tempVec.y;
            targetPositions[i * 3 + 2] = tempVec.z;

            sizes[i] = GRID_SIZE;
            isGrid[i] = 1.0; // All grid initially

            // Default color (White/Base)
            colors[i * 3 + 0] = baseColorObj.r;
            colors[i * 3 + 1] = baseColorObj.g;
            colors[i * 3 + 2] = baseColorObj.b; // Fix typo in original: G repeated twice

            // Init skin weights to 0
            skinIndices[i * 4 + 0] = 0; skinIndices[i * 4 + 1] = 0; skinIndices[i * 4 + 2] = 0; skinIndices[i * 4 + 3] = 0;
            skinWeights[i * 4 + 0] = 0; skinWeights[i * 4 + 1] = 0; skinWeights[i * 4 + 2] = 0; skinWeights[i * 4 + 3] = 0;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(randomPositions, 3));
        geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute('aTargetPos', new THREE.Float32BufferAttribute(targetPositions, 3));
        geometry.setAttribute('aIsGrid', new THREE.Float32BufferAttribute(isGrid, 1));
        geometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('skinIndex', new THREE.Float32BufferAttribute(skinIndices, 4));
        geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));

        // Placeholder normals
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(0), 3));

        this.points = new THREE.Points(geometry, this.material);
        geometry.center();
        this.scene.add(this.points);
    }

    updateParticlesWithModel(baseModel) {
        // Collect Meshes
        const meshes = [];
        let foundSkeleton = null;
        let foundBindMatrix = null;
        let foundBindMatrixInverse = null;

        // Find Armature
        let searchRoot = baseModel.getObjectByName('JOSH');
        if (!searchRoot) {
            console.warn('Armature not found in model, traversing root');
            searchRoot = baseModel;
        }

        searchRoot.traverse((child) => {
            if (child.isMesh) {
                child.updateMatrixWorld(true); // Ensure world matrix is up to date
                meshes.push(child);
                if (child.isSkinnedMesh && !foundSkeleton) {
                    foundSkeleton = child.skeleton;
                    foundBindMatrix = child.bindMatrix;
                    foundBindMatrixInverse = child.bindMatrixInverse;
                }
            }
        });

        // Initialize AnimationMixer if animations exist
        // Note: 'baseModel' passed here is usually gltf.scene. We need access to gltf.animations.
        // But loadModel calls this.updateParticlesWithModel(gltf.scene).
        // Let's modify loadModel to pass animations or handle it there.
        // Actually, let's just create a mixer on the scene root, assuming animations are played on it.
        // But the clips are in gltf.animations. 
        // We'll updated loadModel instead to handle mixer creation.

        const count = this.pointCap;
        const geometry = this.points.geometry;
        const targetPositions = geometry.attributes.aTargetPos.array;
        const sizes = geometry.attributes.aSize.array;
        const isGrid = geometry.attributes.aIsGrid.array;
        const normals = geometry.attributes.normal.array;
        const colors = geometry.attributes.aColor.array;
        const skinIndices = geometry.attributes.skinIndex.array;
        const skinWeights = geometry.attributes.skinWeight.array;
        const posAttr = geometry.attributes.position.array;

        let currentPointIndex = 0;
        const tempVec = new THREE.Vector3();
        const tempNormal = new THREE.Vector3();
        const normalMatrix = new THREE.Matrix3();
        const baseColorObj = new THREE.Color(BASE_COLOR);

        for (let m = 0; m < meshes.length; m++) {
            const mesh = meshes[m];
            const worldMatrix = mesh.matrixWorld;
            normalMatrix.getNormalMatrix(worldMatrix);

            const originalGeometry = mesh.geometry;
            const originalPosAttr = originalGeometry.attributes.position;
            const originalNormals = originalGeometry.attributes.normal;
            const originalSkinIndex = originalGeometry.attributes.skinIndex;
            const originalSkinWeight = originalGeometry.attributes.skinWeight;
            const meshVertexCount = originalPosAttr.count;

            let meshColor = new THREE.Vector3(1, 1, 1);
            let brightness = 1.0;
            const info = MODEL_INFO.find(info => mesh.name.includes(info.name));
            if (info) {
                meshColor = info.baseColor;
                if (info.brightness) brightness = info.brightness;
            }

            for (let i = 0; i < meshVertexCount; i++) {
                if (currentPointIndex >= count) break;

                // Position Logic
                if (mesh.isSkinnedMesh) {
                    // For Skinned Mesh, read LOCAL position (Bind Pose)
                    // Skinning shader will transform this.
                    tempVec.set(originalPosAttr.getX(i), originalPosAttr.getY(i), originalPosAttr.getZ(i));
                    // Dot NOT apply world matrix if we are binding to skeleton

                    // Copy Skin Weights
                    if (originalSkinIndex) {
                        skinIndices[currentPointIndex * 4 + 0] = originalSkinIndex.getX(i);
                        skinIndices[currentPointIndex * 4 + 1] = originalSkinIndex.getY(i);
                        skinIndices[currentPointIndex * 4 + 2] = originalSkinIndex.getZ(i);
                        skinIndices[currentPointIndex * 4 + 3] = originalSkinIndex.getW(i);
                    }
                    if (originalSkinWeight) {
                        skinWeights[currentPointIndex * 4 + 0] = originalSkinWeight.getX(i);
                        skinWeights[currentPointIndex * 4 + 1] = originalSkinWeight.getY(i);
                        skinWeights[currentPointIndex * 4 + 2] = originalSkinWeight.getZ(i);
                        skinWeights[currentPointIndex * 4 + 3] = originalSkinWeight.getW(i);
                    }

                } else {
                    // Static Mesh: Bake World Matrix
                    tempVec.set(originalPosAttr.getX(i), originalPosAttr.getY(i), originalPosAttr.getZ(i));
                    tempVec.applyMatrix4(worldMatrix);

                    // Zero weights for static parts
                    skinWeights[currentPointIndex * 4 + 0] = 0;
                    skinWeights[currentPointIndex * 4 + 1] = 0;
                    skinWeights[currentPointIndex * 4 + 2] = 0;
                    skinWeights[currentPointIndex * 4 + 3] = 0;
                }

                targetPositions[currentPointIndex * 3 + 0] = tempVec.x;
                targetPositions[currentPointIndex * 3 + 1] = tempVec.y;
                targetPositions[currentPointIndex * 3 + 2] = tempVec.z;

                // Normal (Still use world/normal matrix for lighting approximations?)
                // Or should we use original normal if skinned?
                // The point shader computes lighting in View Space using normalMatrix * normal.
                // If the point is skinned, it moves. The normal attributes in buffer are static.
                // Standard skinning shader rotates normals too.
                // My modified shader does NOT skin normals explicitly in 'vNormal = normal', 
                // but standard <skinning_vertex> updates 'objectNormal' and 'transformedNormal'.
                // I need to ensure vNormal gets the skinned normal.
                // BUT, 'aTargetPos' is the source of skinning. 'normal' attribute is used for lighting.
                // If I want dynamic lighting on skinned points, I should likely pass original normals
                // and let the skinning chunk handle them? 
                // The current shader snippet I wrote: vNormal = normal.
                // It doesn't use 'transformedNormal'.
                // Ideally, I should output: vNormal = normalize( normalMatrix * transformedNormal );
                // For now, let's just copy original normals.

                if (originalNormals) {
                    tempNormal.set(originalNormals.getX(i), originalNormals.getY(i), originalNormals.getZ(i));
                    if (!mesh.isSkinnedMesh) {
                        tempNormal.applyMatrix3(normalMatrix).normalize();
                    }
                    normals[currentPointIndex * 3 + 0] = tempNormal.x;
                    normals[currentPointIndex * 3 + 1] = tempNormal.y;
                    normals[currentPointIndex * 3 + 2] = tempNormal.z;
                }

                sizes[currentPointIndex] = 0.5 + Math.pow(Math.random(), 0.7) * 15.5;
                isGrid[currentPointIndex] = 0.0;

                colors[currentPointIndex * 3 + 0] = meshColor.x * brightness;
                colors[currentPointIndex * 3 + 1] = meshColor.y * brightness;
                colors[currentPointIndex * 3 + 2] = meshColor.z * brightness;

                const range = scatterRangeModel;
                posAttr[currentPointIndex * 3 + 0] = (Math.random() * 2.0 - 1.0) * range;
                posAttr[currentPointIndex * 3 + 1] = (Math.random() * 2.0 - 1.0) * range;
                posAttr[currentPointIndex * 3 + 2] = (Math.random() * 2.0 - 1.0) * range;

                currentPointIndex++;
            }
        }

        const modelPointCount = currentPointIndex;
        geometry.attributes.position.needsUpdate = true;
        geometry.attributes.aColor.needsUpdate = true;
        geometry.attributes.skinIndex.needsUpdate = true;
        geometry.attributes.skinWeight.needsUpdate = true;
        geometry.attributes.aTargetPos.needsUpdate = true;
        geometry.attributes.aSize.needsUpdate = true;
        geometry.attributes.aIsGrid.needsUpdate = true;
        geometry.attributes.normal.needsUpdate = true;

        // Bind Skeleton if found
        if (foundSkeleton) {
            this.points.skeleton = foundSkeleton;
            this.points.bindMatrix = foundBindMatrix;
            if (foundBindMatrixInverse) this.points.bindMatrixInverse = foundBindMatrixInverse;
            this.points.isSkinnedMesh = true;
            // Also need to ensure the frustum culling doesn't clip the skinned model incorrectly
            this.points.frustumCulled = false;
        }

        // Shadow Carving (Grid)
        const gridSide = Math.ceil(Math.sqrt(Math.max(0, count - modelPointCount))) || 1;
        const camPos = new THREE.Vector3(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);
        const target = new THREE.Vector3(0, 0, 0);
        const forward = new THREE.Vector3().subVectors(target, camPos).normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();
        const gridOrigin = forward.clone().multiplyScalar(-gridZ);

        // Occupied check using the model points we just collected
        // Note: Skinned points are in local space in 'targetPositions'.
        // This shadow carving logic expects 'targetPositions' to be in World Space to check against camera rays.
        // If we switched targetPositions to local for skinning, we break the shadow carving for the specific pose.
        // SOLUTION: For occupied check, we should compute a world-space proxy position.
        // But the check below uses 'targetPositions' array directly.
        // Since we can't easily compute skinned position in CPU without expensive math,
        // we might have to skip accurate shadow carving for the SkinnedMesh or accept it's based on Bind Pose.
        // Bind Pose is usually T-pose.
        // If the character is in T-pose, the shadow on the grid will be T-pose shaped.
        // That's acceptable.

        const occupied = new Uint8Array(gridSide * gridSide);
        const offset = this.material.uniforms.uModelOffset.value;
        const ndcVec = new THREE.Vector3();
        const modelGapCells = Math.ceil((GAP_SIZE * 3.0) / gridSpacing);

        this.camera.updateMatrixWorld();
        this.camera.updateProjectionMatrix();

        for (let i = 0; i < modelPointCount; i++) {
            // point is at targetPositions[i] (Local/Bind Pose for skinned, World for static)
            // Ideally we'd apply world matrix for skinned too for this check, but we didn't apply it to the buffer.
            // We can re-apply it here just for the check?
            // Usually SkinnedMesh is at (0,0,0) world, so Local = World (ignoring bones).
            // So detection works on Bind Pose.

            tempVec.set(targetPositions[i * 3 + 0], targetPositions[i * 3 + 1], targetPositions[i * 3 + 2]);
            // Project to NDC
            ndcVec.copy(tempVec).project(this.camera);
            ndcVec.x += offset.x;
            ndcVec.y += offset.y;
            ndcVec.unproject(this.camera);

            const rayDir = ndcVec.sub(camPos).normalize();
            const numer = gridOrigin.clone().sub(camPos).dot(forward);
            const denom = rayDir.dot(forward);

            if (denom > 0.0001) {
                const t = numer / denom;
                const hit = camPos.clone().add(rayDir.multiplyScalar(t));
                const local = hit.sub(gridOrigin);
                const c = Math.round(local.dot(right) / gridSpacing + gridSide / 2);
                const r = Math.round(local.dot(up) / gridSpacing + gridSide / 2);

                for (let dx = -modelGapCells; dx <= modelGapCells; dx++) {
                    for (let dy = -modelGapCells; dy <= modelGapCells; dy++) {
                        const nc = c + dx; const nr = r + dy;
                        if (nc >= 0 && nc < gridSide && nr >= 0 && nr < gridSide) {
                            if (dx * dx + dy * dy <= modelGapCells * modelGapCells) {
                                occupied[nr * gridSide + nc] = 1;
                            }
                        }
                    }
                }
            }
        }

        // Apply grid update
        for (let i = modelPointCount; i < count; i++) {
            const extraIndex = i - modelPointCount;
            const col = extraIndex % gridSide;
            const row = Math.floor(extraIndex / gridSide);
            const xOffset = (col - gridSide / 2) * gridSpacing;
            const yOffset = (row - gridSide / 2) * gridSpacing;
            tempVec.copy(gridOrigin).addScaledVector(right, xOffset).addScaledVector(up, yOffset);

            targetPositions[i * 3 + 0] = tempVec.x * 100;
            targetPositions[i * 3 + 1] = tempVec.y * 100;
            targetPositions[i * 3 + 2] = tempVec.z * 100;

            // Grid points don't move with skinning, ensure weights are 0
            skinWeights[i * 4 + 0] = 0; skinWeights[i * 4 + 1] = 0; skinWeights[i * 4 + 2] = 0; skinWeights[i * 4 + 3] = 0;

            if (occupied[row * gridSide + col] === 1) {
                sizes[i] = 0.0;
            } else {
                let nearHalo = false;
                const checkRad = 2;
                for (let dx = -checkRad; dx <= checkRad; dx++) {
                    for (let dy = -checkRad; dy <= checkRad; dy++) {
                        const nc = col + dx; const nr = row + dy;
                        if (nc >= 0 && nc < gridSide && nr >= 0 && nr < gridSide) {
                            if (occupied[nr * gridSide + nc] === 1) { nearHalo = true; break; }
                        }
                    }
                    if (nearHalo) break;
                }
                isGrid[i] = nearHalo ? 25.0 : 2.0;
                sizes[i] = GRID_SIZE;
            }
            // Restore grid color (White)
            colors[i * 3 + 0] = baseColorObj.r;
            colors[i * 3 + 1] = baseColorObj.g;
            colors[i * 3 + 2] = baseColorObj.b;
        }

        geometry.attributes.aTargetPos.needsUpdate = true;
        geometry.attributes.aSize.needsUpdate = true;
        geometry.attributes.aIsGrid.needsUpdate = true;
        geometry.attributes.normal.needsUpdate = true;
    }

    createControlUI() {
        UI.createUI({
            material: this.material,
            bloomPass: this.bloomPass,
            TWEEN,
            MORPH_DURATION,
            DEFAULT_VIBRATE_AMPLITUDE,
            DEFAULT_SIZE_THRESHOLD,
            DEFAULT_VIBRATE_BOOST_SIZE_THRESHOLD,
            POINT_SIZE,
            UI_WIDTH,
            UI_TOP,
            UI_RIGHT,
            speed: this.speed,
            hoverEffect: this.hoverEffect,
            mouseDamping,
            pointReturnSpeed,
            onStart: () => {
                const isGoingToModel = this.material.uniforms.uProgress.value < 0.5;
                const targetThreshold = isGoingToModel ? MODEL_SIZE_THRESHOLD : DEFAULT_SIZE_THRESHOLD;

                new TWEEN.Tween(this.material.uniforms.uSizeThreshold)
                    .to({ value: targetThreshold }, MORPH_DURATION)
                    .easing(TWEEN.Easing.Cubic.InOut)
                    .start();
            },
            onComplete: () => {
                // Animation complete callback
            }
        });
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        this.targetMouse.copy(this.mouse);

        if (this.isFirstMouseMove) {
            this.smoothMouse.copy(this.targetMouse);
            this.smoothRepulsionMouse.copy(this.targetMouse);
            this.isFirstMouseMove = false;
        }
    }

    onMouseLeave() {
        this.targetMouse.set(10000, 10000);
        this.isFirstMouseMove = true;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
        if (this.material) {
            this.material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
        }
    }

    update() {
        TWEEN.update();
        if (this.controls) this.controls.update();

        // Update Animation Mixer
        const delta = this.clock.getDelta();
        if (this.mixer) {
            this.mixer.update(delta);
            // Verify if root needs update for bones
            if (this.animModelRoot) this.animModelRoot.updateMatrixWorld(true);
        }

        // Force skeleton update if skinned
        if (this.points.isSkinnedMesh && this.points.skeleton) {
            this.points.skeleton.update();
        }

        // Smooth damping of mouse
        this.smoothMouse.x += (this.targetMouse.x - this.smoothMouse.x) * mouseDamping.value;
        this.smoothMouse.y += (this.targetMouse.y - this.smoothMouse.y) * mouseDamping.value;

        // Separate slower smoothing for repulsion effect
        this.smoothRepulsionMouse.x += (this.targetMouse.x - this.smoothRepulsionMouse.x) * pointReturnSpeed.value;
        this.smoothRepulsionMouse.y += (this.targetMouse.y - this.smoothRepulsionMouse.y) * pointReturnSpeed.value;

        this.raycaster.setFromCamera(this.smoothMouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.intersectionPlane);

        if (this.material) {
            const elapsedTime = this.clock.getElapsedTime();
            this.material.uniforms.iTime.value = elapsedTime;

            if (intersects.length > 0) {
                this.material.uniforms.uMousePos.value.copy(intersects[0].point);
            }

            this.material.uniforms.uBaseRotateSpeed.value = this.speed.value;
            this.material.uniforms.uHoverRadius.value = this.hoverEffect.radius;
            // Use slower-smoothed position for repulsion to control point return speed
            if (this.material.uniforms.uMouseNDC) this.material.uniforms.uMouseNDC.value.copy(this.smoothRepulsionMouse);

            // Smoothly blend in mouse interactions as the morph completes
            // interactionStrength goes from 0.0 to 1.0 as uProgress goes from 0.8 to 1.0
            let progress = 0;
            if (this.material.uniforms.uProgress) progress = this.material.uniforms.uProgress.value;

            const interactionStrength = Math.max(0, Math.min(1, (progress - 0.8) / 0.2));

            // Update Rotation based on X mouse position
            if (this.material.uniforms.uModelRotationY) {
                this.material.uniforms.uModelRotationY.value = this.smoothMouse.x * -0.13 * interactionStrength;
            }

            // Update Light Direction Y based on Mouse Y
            if (this.material.uniforms.uLightDir) {
                // Base Y is -100.0. Target varies by +/- 100 based on mouse.
                const targetLightY = -100.0 + this.smoothMouse.y * 100.0;
                // Lerp between base (-100) and target based on interactionStrength
                this.material.uniforms.uLightDir.value.y = -100.0 + (targetLightY - (-100.0)) * interactionStrength;
            }
        }

        this.composer.render();
    }
}
