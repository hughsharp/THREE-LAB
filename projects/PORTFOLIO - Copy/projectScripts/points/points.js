import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
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
const scatterRangeModel = 60;
const scatterRangeGrid = 1000;
const POINT_SIZE = 0.05;
const GRID_SIZE = 60;
const DEFAULT_PIXEL_RATIO = 2.0;

const MODEL_PATH = './models/model.glb';
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
const gridZ = -50.0;
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
        this.controls = null;

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

        // Initialize
        this.init();
    }

    init() {
        // Postprocessing
        this.initPostprocessing();

        // Controls (Attaching to the given renderer's element)
        // We assume the main app handles camera movement, but if we need local overrides:
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;

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

        // Load Content
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
        return textureLoader.load('./textures/sprite.png');
    }

    loadModel() {
        const starTexture = this.createStarTexture();
        const loader = new GLTFLoader();

        loader.load(MODEL_PATH, (gltf) => {
            this.material = new THREE.ShaderMaterial({
                uniforms: {
                    uSize: { value: POINT_SIZE },
                    uColor: { value: new THREE.Color(BASE_COLOR) },
                    uPixelRatio: { value: DEFAULT_PIXEL_RATIO },
                    uLightDir: { value: new THREE.Vector3(LIGHT_DIR_X, LIGHT_DIR_Y, LIGHT_DIR_Z) },
                    iTime: { value: 0.0 },
                    uVibrateAmp: { value: DEFAULT_VIBRATE_AMPLITUDE },
                    uProgress: { value: 0.0 },
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
            });

            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    if (child.name !== 'avatar-point') return;

                    this.createParticles(child);
                }
            });

            // Create UI after material is ready
            this.createUI();

        }, undefined, (err) => {
            console.error('Error loading model:', err);
        });
    }

    createParticles(mesh) {
        const originalGeometry = mesh.geometry;
        if (!originalGeometry || !originalGeometry.attributes || !originalGeometry.attributes.position) return;

        const count = 100000;
        const originalPosAttr = originalGeometry.attributes.position;
        const originalCount = originalPosAttr.count;

        const randomPositions = new Float32Array(count * 3);
        const targetPositions = new Float32Array(count * 3);
        const sizes = new Float32Array(count);
        const textureIndices = new Float32Array(count);
        const isGrid = new Float32Array(count);

        // Grid configuration
        const extraPoints = Math.max(0, count - originalCount);
        const gridSide = Math.ceil(Math.sqrt(extraPoints)) || 1;

        // Calculate grid basis vectors
        const camPos = new THREE.Vector3(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);
        const target = new THREE.Vector3(0, 0, 0);
        const forward = new THREE.Vector3().subVectors(target, camPos).normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();

        const gridOrigin = forward.clone().multiplyScalar(-gridZ);
        const tempVec = new THREE.Vector3();

        for (let i = 0; i < count; i++) {
            const range = (i < originalCount) ? scatterRangeModel : scatterRangeGrid;

            randomPositions[i * 3 + 0] = (Math.random() * 2.0 - 1.0) * range;
            randomPositions[i * 3 + 1] = (Math.random() * 2.0 - 1.0) * range;
            randomPositions[i * 3 + 2] = (Math.random() * 2.0 - 1.0) * range;

            if (i < originalCount) {
                targetPositions[i * 3 + 0] = originalPosAttr.getX(i);
                targetPositions[i * 3 + 1] = originalPosAttr.getY(i);
                targetPositions[i * 3 + 2] = originalPosAttr.getZ(i);
                isGrid[i] = 0.0;
            } else {
                const extraIndex = i - originalCount;
                const col = extraIndex % gridSide;
                const row = Math.floor(extraIndex / gridSide);
                const xOffset = (col - gridSide / 2) * gridSpacing;
                const yOffset = (row - gridSide / 2) * gridSpacing;

                tempVec.copy(gridOrigin)
                    .addScaledVector(right, xOffset)
                    .addScaledVector(up, yOffset);

                targetPositions[i * 3 + 0] = tempVec.x;
                targetPositions[i * 3 + 1] = tempVec.y;
                targetPositions[i * 3 + 2] = tempVec.z;
                isGrid[i] = 1.0;
            }

            if (i < originalCount) {
                const largeRandom = 0.5 + Math.pow(Math.random(), 0.7) * 15.5;
                sizes[i] = largeRandom;
            } else {
                sizes[i] = GRID_SIZE;
            }

            textureIndices[i] = Math.floor(Math.random() * 32);
        }

        // Shadow Carving Logic
        const occupied = new Uint8Array(gridSide * gridSide);
        const projectionScaleEstimate = 3.0;
        const effectiveGap = GAP_SIZE * projectionScaleEstimate;
        const modelGapCells = Math.ceil(effectiveGap / gridSpacing);

        mesh.updateMatrixWorld(true);
        const worldMatrix = mesh.matrixWorld;
        this.camera.updateMatrixWorld();
        this.camera.updateProjectionMatrix();

        const offset = this.material.uniforms.uModelOffset.value;
        const ndcVec = new THREE.Vector3();

        for (let i = 0; i < originalCount; i++) {
            tempVec.set(
                originalPosAttr.getX(i),
                originalPosAttr.getY(i),
                originalPosAttr.getZ(i)
            );
            tempVec.applyMatrix4(worldMatrix);

            ndcVec.copy(tempVec).project(this.camera);
            ndcVec.x += offset.x;
            ndcVec.y += offset.y;
            ndcVec.unproject(this.camera);

            const rayDir = ndcVec.sub(camPos).normalize();
            const numer = gridOrigin.clone().sub(camPos).dot(forward);
            const denom = rayDir.dot(forward);

            if (denom > 0.0001) {
                const t = numer / denom;
                const hitPoint = camPos.clone().add(rayDir.multiplyScalar(t));
                const localHit = hitPoint.sub(gridOrigin);
                const c = Math.round(localHit.dot(right) / gridSpacing + gridSide / 2);
                const r = Math.round(localHit.dot(up) / gridSpacing + gridSide / 2);

                for (let dx = -modelGapCells; dx <= modelGapCells; dx++) {
                    for (let dy = -modelGapCells; dy <= modelGapCells; dy++) {
                        const nc = c + dx;
                        const nr = r + dy;
                        if (nc >= 0 && nc < gridSide && nr >= 0 && nr < gridSide) {
                            if (dx * dx + dy * dy <= modelGapCells * modelGapCells) {
                                occupied[nr * gridSide + nc] = 1;
                            }
                        }
                    }
                }
            }
        }

        for (let i = originalCount; i < count; i++) {
            const extraIndex = i - originalCount;
            const c = extraIndex % gridSide;
            const r = Math.floor(extraIndex / gridSide);

            if (occupied[r * gridSide + c] === 1) {
                sizes[i] = 0.0;
            } else {
                let nearHalo = false;
                const checkRad = 2;
                for (let dx = -checkRad; dx <= checkRad; dx++) {
                    for (let dy = -checkRad; dy <= checkRad; dy++) {
                        const nc = c + dx;
                        const nr = r + dy;
                        if (nc >= 0 && nc < gridSide && nr >= 0 && nr < gridSide) {
                            if (occupied[nr * gridSide + nc] === 1) {
                                nearHalo = true;
                                break;
                            }
                        }
                    }
                    if (nearHalo) break;
                }

                if (nearHalo) {
                    isGrid[i] = 25; // Fierce jitter near halo
                } else {
                    isGrid[i] = 2.; // Low jitter for background
                }
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(randomPositions, 3));
        geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
        geometry.setAttribute('aTargetPos', new THREE.Float32BufferAttribute(targetPositions, 3));
        geometry.setAttribute('aTextureIndex', new THREE.Float32BufferAttribute(textureIndices, 1));
        geometry.setAttribute('aIsGrid', new THREE.Float32BufferAttribute(isGrid, 1));

        // Use default normals if missing
        const normals = originalGeometry.attributes.normal || new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(0), 3);
        geometry.setAttribute('normal', normals);

        this.points = new THREE.Points(geometry, this.material);
        geometry.center();

        this.scene.add(this.points);
    }

    createUI() {
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



