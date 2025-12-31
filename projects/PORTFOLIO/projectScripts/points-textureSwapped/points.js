import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass-transparentBg.js';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';
import { createUI as createUIFromModule } from './ui.js';
import { vertexShader, fragmentShader } from './shaders.js';


// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const scatterRangeModel = 190;
const scatterRangeGrid = 300;
const POINT_SIZE = 0.05;
const GRID_SIZE = 60;
const DEFAULT_PIXEL_RATIO = 2.0;

const MODEL_PATH = './models/avatar1.glb';
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

// Postprocessing (Bloom)
const BLOOM_STRENGTH = 2;
const BLOOM_RADIUS = 0.4;
const BLOOM_THRESHOLD = 0.8;

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
        "name": "man",
        "baseColor": new THREE.Vector3(1, 1, 1),
        "brightness": 1.0
    },
    {
        "name": "heart",
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

        // Bind methods

        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);

        // Default point count
        this.pointCap = 100000

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
        this.loadModel();
    }



    initPostprocessing() {
        this.composer = new EffectComposer(this.renderer);
        const renderPass = new RenderPass(this.scene, this.camera);

        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            BLOOM_STRENGTH,
            BLOOM_RADIUS,
            BLOOM_THRESHOLD
        );

        this.composer.addPass(renderPass);
        this.composer.addPass(this.bloomPass);
    }

    createStarTexture() {
        const textureLoader = new THREE.TextureLoader();
        return textureLoader.load('./textures/spritex128.webp');
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

            // Show Main Control UI
            this.createControlUI();
        });

        this.overlayContainer.appendChild(this.enterBtn);
    }

    loadModel() {
        const loader = new GLTFLoader();
        // const dracoLoader = new DRACOLoader();
        // dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');
        // loader.setDRACOLoader(dracoLoader);

        loader.load(MODEL_PATH, (gltf) => {
            let mesh = null;
            gltf.scene.traverse((child) => {
                if (child.isMesh && !mesh) mesh = child;
            });

            if (mesh) {
                this.updateParticlesWithModel(gltf.scene); // Pass the whole scene to handle multiple meshes
            }

            // Loading Complete
            this.progressText.innerText = '100%';
            this.progressBar.style.width = '100%';

            setTimeout(() => {
                this.progressText.style.display = 'none';
                this.progressBarContainer.style.display = 'none';
                this.enterBtn.style.display = 'block';
            }, 500);

        }, (xhr) => {
            if (xhr.lengthComputable) {
                const percent = Math.floor((xhr.loaded / xhr.total) * 100);
                this.progressText.innerText = `${percent}%`;
                this.progressBar.style.width = `${percent}%`;
            }
        });
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
                uModelRotationY: { value: 0.0 }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            depthWrite: false,
            // blending: THREE.AdditiveBlending
        });

        // Create 100k points for background
        const count = this.pointCap;
        const randomPositions = new Float32Array(count * 3);
        const targetPositions = new Float32Array(count * 3); // Placeholders
        const sizes = new Float32Array(count);
        const isGrid = new Float32Array(count);
        const colors = new Float32Array(count * 3); // New Color Attribute

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
            colors[i * 3 + 1] = baseColorObj.g;
            colors[i * 3 + 2] = baseColorObj.b;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(randomPositions, 3));
        geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute('aTargetPos', new THREE.Float32BufferAttribute(targetPositions, 3));
        geometry.setAttribute('aIsGrid', new THREE.Float32BufferAttribute(isGrid, 1));
        geometry.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3));

        // Placeholder normals
        geometry.setAttribute('normal', new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(0), 3));

        this.points = new THREE.Points(geometry, this.material);
        geometry.center();
        this.scene.add(this.points);
    }

    updateParticlesWithModel(baseModel) {
        // Collect Meshes
        const meshes = [];
        baseModel.traverse((child) => {
            if (child.isMesh) {
                child.updateMatrixWorld(true); // Ensure world matrix is up to date
                meshes.push(child);
            }
        });

        const count = this.pointCap;
        const geometry = this.points.geometry;
        const targetPositions = geometry.attributes.aTargetPos.array;
        const sizes = geometry.attributes.aSize.array;
        const isGrid = geometry.attributes.aIsGrid.array;
        const normals = geometry.attributes.normal.array;
        const colors = geometry.attributes.aColor.array;
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

                // Position (Apply World Matrix)
                tempVec.set(originalPosAttr.getX(i), originalPosAttr.getY(i), originalPosAttr.getZ(i));
                tempVec.applyMatrix4(worldMatrix);

                targetPositions[currentPointIndex * 3 + 0] = tempVec.x;
                targetPositions[currentPointIndex * 3 + 1] = tempVec.y;
                targetPositions[currentPointIndex * 3 + 2] = tempVec.z;

                // Normal (Apply Normal Matrix)
                if (originalNormals) {
                    tempNormal.set(originalNormals.getX(i), originalNormals.getY(i), originalNormals.getZ(i));
                    tempNormal.applyMatrix3(normalMatrix).normalize();
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

        // Shadow Carving (Grid)
        const gridSide = Math.ceil(Math.sqrt(Math.max(0, count - modelPointCount))) || 1;
        const camPos = new THREE.Vector3(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);
        const target = new THREE.Vector3(0, 0, 0);
        const forward = new THREE.Vector3().subVectors(target, camPos).normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();
        const gridOrigin = forward.clone().multiplyScalar(-gridZ);

        // Occupied check using the model points we just collected (which are now in World Space)
        const occupied = new Uint8Array(gridSide * gridSide);
        const offset = this.material.uniforms.uModelOffset.value;
        const ndcVec = new THREE.Vector3();
        const modelGapCells = Math.ceil((GAP_SIZE * 3.0) / gridSpacing);

        this.camera.updateMatrixWorld();
        this.camera.updateProjectionMatrix();

        for (let i = 0; i < modelPointCount; i++) {
            // point is at targetPositions[i]
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

            targetPositions[i * 3 + 0] = tempVec.x;
            targetPositions[i * 3 + 1] = tempVec.y;
            targetPositions[i * 3 + 2] = tempVec.z;

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
        createUIFromModule({
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
