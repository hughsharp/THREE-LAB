import * as THREE from 'three';
import { gltfLoader, rgbeLoader, textureLoader, dracoLoader, handleProgress, registerFile } from '../../configs/setupLoaders.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass-transparentBg.js';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';
import { createUI as createUIFromModule } from './ui.js';
import { vertexShader, fragmentShader } from './shaders.js';
import { getBackInOut, BACK_IN_OUT_DEFAULT, BACK_OUT_DEFAULT } from '../utils/customTween.js';

import { linkConstantUniforms } from '../utils/addConstantUniform.js'
import { resources } from '../resources/loadResources.js';
import { getSpriteInfo } from './spriteMapping.js';
import { Tooltip } from './tooltip.js';
import { initScrollMorph } from '../interactions/scroll-pointsMorph.js';
// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const MORPH_DURATION = 1500; // Duration of morphing animation (ms) used in TWEEN

// Scatter Ranges: How far points are spread out
const scatterRangeModel = 190 * 1; // Chaos range when forming a model (to fly in from)
const scatterRangeGrid = 450 * 1;  // Initial chaos range for the background cloud

// Point Properties
const GRID_SIZE = 55;         // Calculated size for background grid points
const POINT_COUNT = 60000;    // Total number of particles in the system

const MODEL_PATH = './models/josh-wave4.glb';

const MODEL_SIZE_THRESHOLD = 12.0;

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
const BLOOM_STRENGTH = 1;
const BLOOM_RADIUS = 0.4;
const BLOOM_THRESHOLD = 0.8;



// GRID
const gridZ = -40.0;
const gridSpacing = 2.5;
const GAP_SIZE = 1;

// UI controls
const UI_WIDTH = '200px';
const UI_TOP = '20px';
const UI_RIGHT = '20px';


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
    constructor(scene, camera, renderer, raycaster, options = {}) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.options = Object.assign({ enableUI: true }, options);
        // Stored for model access

        // Postprocessing
        this.composer = null;
        this.bloomPass = null;

        // Objects & Raycasting
        this.points = null;
        this.userData = {};
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
        this.rawMouse = new THREE.Vector2(0, 0); // For tooltip positioning
        this.isFirstMouseMove = true;

        // Animation state
        this.clock = new THREE.Clock();
        // this.speed = { value: 1. };
        // this.hoverEffect = { radius: 200.0 };

        // Bind methods

        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseLeave = this.onMouseLeave.bind(this);
        this.onWindowResize = this.onWindowResize.bind(this);

        // Default point count
        this.pointCap = POINT_COUNT

        const camPos = new THREE.Vector3(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);
        const target = new THREE.Vector3(0, 0, 0);
        const forward = new THREE.Vector3().subVectors(target, camPos).normalize();
        console.log("Grid Forward Vector:", forward);


        const shaderUniforms = {
            // Core/System
            iTime: { value: 0.0 },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uPixelRatio: { value: 2.0 },
            uMousePos: { value: new THREE.Vector3(0, 0, 0) },
            uMouseNDC: { value: new THREE.Vector2(0, 0) },
            uProgress: { value: 0.0 }, // Start at scattered state
            uIsChaos: { value: 1.0 },

            // Appearance
            uSize: { value: 0.03 },
            uColor: { value: new THREE.Color('#ffffff') },
            uStarTexture: { value: resources.spriteSheet },
            uSizeThreshold: { value: 18.0 },
            uCols: { value: 8.0 },
            uRows: { value: 4.0 },

            // Lighting
            uLightDir: { value: new THREE.Vector3(-100, -100.0, 100.7) },
            uLightStrength: { value: 1.0 },
            uLightSizeBoost: { value: 1.5 },

            // Model Transform
            uModelScale: { value: 1 },
            uModelPosition: { value: new THREE.Vector3(0, 0, 0) },
            uModelRotation: { value: new THREE.Vector3(0, 0, 0) },
            uEnableMouseRotation: { value: true }, // Boolean flag
            uAttractionForce: { value: 0.0 },
            uIsArmatureState: { value: 0.0 },
            uAttractionRefSize: { value: 20.0 },
            uModelScreenOffset: { value: new THREE.Vector2(0., 0) },
            uModelPointSizeFactor: { value: 1.0 },
            uHoverPointScaleFactor: { value: 2.5 },

            // Vibration/Animation
            uVibrateAmp: { value: 0.25 },
            uModelVibFactor: { value: 1.0 },
            uVibrateBoostSizeThreshold: { value: 35.0 },
            uBaseRotateSpeed: { value: 1. },
            uHoverRadius: { value: 200.0 },
            uAttractionRadius: { value: 200.0 },

            // Grid
            uGridZ: { value: gridZ },
            uBaseGridZ: { value: gridZ },
            uGridForward: { value: forward }
        }

        this.shaderUniforms = shaderUniforms;
        // store a deep copy of the base uniforms
        // this.userData.baseUniforms = 
        const chaosUniforms = THREE.UniformsUtils.clone(this.shaderUniforms);
        this.userData.chaosUniforms = chaosUniforms;

        // Tooltip
        this.tooltip = new Tooltip();

        this.enableScrollMorph = true; // Flag for scroll-based morphing interaction

        // Initialize
        this.init();
    }

    init() {
        // Postprocessing
        this.initPostprocessing();

        // Tooltip DOM created in Tooltip class
        // this.tooltip = document.createElement('div'); ...

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

        // --- Interaction Initialization ---
        initScrollMorph(this);

        // Create Loading UI
        // Create Loading UI
        this.createLandingOverlay();

        // Create Background Points immediately
        this.createBackgroundParticles();

        // Start Loading Model (Background)
        this.loadModel();

        console.log(this)
        console.log(this)
    }

    // Animation reset
    playIntro() {
        this.clock.start(); // Resets elapsedTime to 0, triggering the shader 'appear' animation
        this.clock.elapsedTime = 0; // Explicitly ensure 0
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

    // createStarTexture() {
    //     const textureLoader = new THREE.TextureLoader();
    //     return textureLoader.load('./textures/spritex128.webp');
    // }

    createLandingOverlay() {
        // Create container for Loading/Enter UI
        this.overlayContainer = document.createElement('div');
        console.log(this.overlayContainer)
        //add ID to this overlay for debugging
        this.overlayContainer.id = 'overlay-container';
        Object.assign(this.overlayContainer.style, {
            position: 'absolute', top: '0', left: '0', width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none', zIndex: '9999'
        });
        document.body.appendChild(this.overlayContainer);

        // Progress Text
        if (this.options.enableUI) {
            this.progressText = document.createElement('div');
            this.progressText.innerText = '0%';
            Object.assign(this.progressText.style, {
                color: 'white', fontSize: '24px', fontFamily: 'sans-serif', marginBottom: '20px'
            });
            this.overlayContainer.appendChild(this.progressText);
        }

        // Progress Bar
        if (this.options.enableUI) {
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
        }

        // Create wrapper for bottom controls
        this.controlsWrapper = document.createElement('div');
        this.controlsWrapper.style.position = 'absolute';
        this.controlsWrapper.style.bottom = '30px';
        this.controlsWrapper.style.left = '50%';
        this.controlsWrapper.style.transform = 'translateX(-50%)';
        this.controlsWrapper.style.display = this.options.enableUI ? 'none' : 'flex'; // Hidden until loaded if UI enabled
        this.controlsWrapper.style.flexDirection = 'column';
        this.controlsWrapper.style.alignItems = 'center';
        this.controlsWrapper.style.gap = '15px';
        this.controlsWrapper.style.zIndex = '1000';
        this.controlsWrapper.style.background = 'rgba(0, 0, 0, 0.5)';
        this.controlsWrapper.style.padding = '10px 20px';
        this.controlsWrapper.style.borderRadius = '12px';
        this.controlsWrapper.style.backdropFilter = 'blur(5px)';
        this.controlsWrapper.style.pointerEvents = 'auto'; // Enable clicks
        this.overlayContainer.appendChild(this.controlsWrapper);

        // Create row container for buttons
        this.buttonRow = document.createElement('div');
        this.buttonRow.style.display = 'flex';
        this.buttonRow.style.alignItems = 'center';
        this.buttonRow.style.gap = '10px';
        this.controlsWrapper.appendChild(this.buttonRow);

        // Input for Morph Index
        this.morphInput = document.createElement('input');
        this.morphInput.type = 'number';
        this.morphInput.value = '0'; // Default to 0
        this.morphInput.style.padding = '10px';
        this.morphInput.style.fontSize = '16px';
        this.morphInput.style.borderRadius = '8px';
        this.morphInput.style.border = '1px solid #444';
        this.morphInput.style.background = '#222';
        this.morphInput.style.color = '#fff';
        // Back Button
        this.backBtn = document.createElement('button');
        this.backBtn.innerText = 'Back';
        this.backBtn.style.padding = '12px 20px';
        this.backBtn.style.fontSize = '18px';
        this.backBtn.style.border = 'none';
        this.backBtn.style.borderRadius = '30px';
        this.backBtn.style.background = '#444';
        this.backBtn.style.color = '#fff';
        this.backBtn.style.cursor = 'pointer';
        this.backBtn.style.fontFamily = "'Orbitron', sans-serif";
        this.backBtn.style.textTransform = 'uppercase';
        this.backBtn.style.marginRight = '10px';

        this.triggerPrevMorph = () => {
            let geometry = this.points.geometry;
            let total = geometry.morphData ? geometry.morphData.length : 0;
            if (total === 0) return;

            let current = geometry.morphCurrentIndex || 0;
            let prev = (current - 1 + total) % total;

            console.log(`Cycling to prev morph index: ${prev}`);
            this.morphInput.value = prev;
            this.morphToTarget(prev);

            // Show Main Control UI
            if (!this.controlsCreated) {
                this.createControlUI();
                this.controlsCreated = true;
            }
        };

        this.backBtn.onclick = this.triggerPrevMorph;
        this.buttonRow.appendChild(this.backBtn);

        this.morphInput.style.width = '60px';
        this.morphInput.style.textAlign = 'center';
        this.buttonRow.appendChild(this.morphInput);

        // Morph Button
        this.enterBtn = document.createElement('button');
        this.enterBtn.innerText = 'Morph';
        this.enterBtn.style.padding = '12px 30px'; // Slightly fat button
        this.enterBtn.style.fontSize = '18px';
        this.enterBtn.style.border = 'none';
        this.enterBtn.style.borderRadius = '30px';
        this.enterBtn.style.background = 'linear-gradient(90deg, #ff0077, #7700ff)'; // Energetic gradient
        this.enterBtn.style.color = '#fff';
        this.enterBtn.style.cursor = 'pointer';
        this.enterBtn.style.fontFamily = "'Orbitron', sans-serif";
        this.enterBtn.style.textTransform = 'uppercase';
        this.enterBtn.style.letterSpacing = '2px';
        this.enterBtn.style.boxShadow = '0 0 15px rgba(255, 0, 119, 0.5)';
        this.enterBtn.style.transition = 'all 0.3s ease';
        this.enterBtn.style.display = this.options.enableUI ? 'none' : 'block'; // Initially hidden until loaded if UI enabled

        // Hover Effect
        this.enterBtn.onmouseenter = () => {
            this.enterBtn.style.transform = 'scale(1.05)';
            this.enterBtn.style.boxShadow = '0 0 25px rgba(119, 0, 255, 0.7)';
        };
        this.enterBtn.onmouseleave = () => {
            this.enterBtn.style.transform = 'scale(1.0)';
            this.enterBtn.style.boxShadow = '0 0 15px rgba(255, 0, 119, 0.5)';
        };

        this.buttonRow.appendChild(this.enterBtn);

        // Next Button
        this.nextBtn = document.createElement('button');
        this.nextBtn.innerText = 'Next';
        this.nextBtn.style.padding = '12px 20px';
        this.nextBtn.style.fontSize = '18px';
        this.nextBtn.style.border = 'none';
        this.nextBtn.style.borderRadius = '30px';
        this.nextBtn.style.background = '#444';
        this.nextBtn.style.color = '#fff';
        this.nextBtn.style.cursor = 'pointer';
        this.nextBtn.style.fontFamily = "'Orbitron', sans-serif";
        this.nextBtn.style.textTransform = 'uppercase';
        this.nextBtn.style.marginLeft = '10px';

        this.triggerNextMorph = () => {
            // Cycle logic
            let geometry = this.points.geometry;
            let total = geometry.morphData ? geometry.morphData.length : 0;
            if (total === 0) return;

            let current = geometry.morphCurrentIndex || 0;
            let next = (current + 1) % total;

            console.log(`Cycling to next morph index: ${next}`);
            this.morphInput.value = next; // Update input
            this.morphToTarget(next);

            // Show Main Control UI
            if (!this.controlsCreated) {
                this.createControlUI();
                this.controlsCreated = true;
            }
        };

        this.nextBtn.onclick = this.triggerNextMorph;
        this.buttonRow.appendChild(this.nextBtn);

        // Create slider row for uProgress
        this.sliderRow = document.createElement('div');
        this.sliderRow.style.display = 'flex';
        this.sliderRow.style.alignItems = 'center';
        this.sliderRow.style.gap = '10px';
        this.sliderRow.style.width = '100%';
        this.sliderRow.style.justifyContent = 'center';
        this.controlsWrapper.appendChild(this.sliderRow);

        // Progress Slider
        this.progressSlider = document.createElement('input');
        this.progressSlider.type = 'range';
        this.progressSlider.min = '0';
        this.progressSlider.max = '1';
        this.progressSlider.step = '0.01';
        this.progressSlider.value = '0';
        this.progressSlider.style.width = '300px';
        this.progressSlider.style.cursor = 'pointer';

        // Update uProgress when slider changes
        this.progressSlider.oninput = (e) => {
            console.log(this.points.material.uniforms.uProgress);
            const value = parseFloat(e.target.value);
            console.log(value);
            if (this.points.material && this.points.material.uniforms.uProgress) {
                this.points.material.uniforms.uProgress.value = value;
            }
        };

        this.sliderRow.appendChild(this.progressSlider);

        // Keyboard Listener
        window.addEventListener('keydown', (e) => {
            if (e.key === 'n' || e.key === 'N') {
                this.triggerNextMorph();
            }
        });

        this.enterBtn.addEventListener('click', () => {
            // Get index from input
            const index = parseInt(this.morphInput.value, 10);
            if (isNaN(index)) return;

            console.log(`Morphing to target index: ${index}`);

            this.morphToTarget(index);

            // Do not hide the UI controls

            // Show Main Control UI
            if (!this.controlsCreated) {
                this.createControlUI();
                this.controlsCreated = true;
            }
        });

        // this.overlayContainer.appendChild(this.progressBarContainer); // Handled above
    }

    addMorphData(name, data, targetUniforms = this.userData.chaosUniforms) {
        //name, targetPosArr, targetColorArr, targetSizeIsGridArr, targetNormalArr
        let { targetPosAttr, targetColorAttr, targetSizeIsGridAttr, targetNormalAttr, targetSkinIndexAttr, targetSkinWeightAttr, targetSkeleton, targetBindMatrix, targetBindMatrixInverse } = data;
        let morphDataArr = this.points.geometry.morphData ?? [];
        if (!this.morphData) this.morphData = {};

        const newItem = {
            name: name,
            targetUniforms: targetUniforms,
            targetPosAttr: targetPosAttr,
            targetColorAttr: targetColorAttr,
            targetSizeIsGridAttr: targetSizeIsGridAttr,
            targetNormalAttr: targetNormalAttr,
            targetSkinIndexAttr: targetSkinIndexAttr,
            targetSkinWeightAttr: targetSkinWeightAttr,
            targetSkeleton: targetSkeleton,
            targetBindMatrix: targetBindMatrix,
            targetBindMatrixInverse: targetBindMatrixInverse
        };

        // check if name exists update, else add
        let index = morphDataArr.findIndex((item) => item.name === name);
        if (index !== -1) {
            morphDataArr[index] = newItem;
        } else {
            morphDataArr.push(newItem);
        }

        this.points.geometry.morphData = morphDataArr;
        this.morphData[name] = newItem; // Update cache
    }
    _getMorphData(index) {
        if (typeof index === 'string') return this.morphData[index];
        return this.points.geometry.morphData[index];
    }
    _setMorphTargetData(nameOrIndex) {
        const data = this._getMorphData(nameOrIndex);
        if (!data) {
            console.error(`Morph target ${nameOrIndex} not found`);
            return;
        }

        const geometry = this.points.geometry;

        geometry.setAttribute('aTargetPos', data.targetPosAttr);
        geometry.setAttribute('aTargetColor', data.targetColorAttr);
        geometry.setAttribute('aTargetNormal', data.targetNormalAttr);
        geometry.setAttribute('aTargetSizeIsGrid', data.targetSizeIsGridAttr); // Packed Buffer

        // Custom Skinning attributes
        if (data.targetSkinIndexAttr) geometry.setAttribute('skinIndex', data.targetSkinIndexAttr);
        if (data.targetSkinWeightAttr) geometry.setAttribute('aTargetSkinWeight', data.targetSkinWeightAttr);

        if (data.targetSkeleton) {
            this.points.skeleton = data.targetSkeleton;
            this.points.bindMatrix = data.targetBindMatrix || new THREE.Matrix4();
            this.points.bindMatrixInverse = data.targetBindMatrixInverse || new THREE.Matrix4();
            this.points.isSkinnedMesh = true;
        } else {
            this.points.isSkinnedMesh = false;
        }

        // Trigger updates
        geometry.attributes.aTargetPos.needsUpdate = true;
        geometry.attributes.aTargetColor.needsUpdate = true;
        geometry.attributes.aTargetNormal.needsUpdate = true;
        geometry.attributes.aTargetSizeIsGrid.needsUpdate = true;
        if (geometry.attributes.skinIndex) geometry.attributes.skinIndex.needsUpdate = true;
        if (geometry.attributes.aTargetSkinWeight) geometry.attributes.aTargetSkinWeight.needsUpdate = true;
    }

    morphToTarget(targetDataIndex) {
        // Prevent morph if already in progress (approximate check for 0)
        if (this.material.uniforms.uProgress.value > 0.01) {
            console.warn("Morph already in progress. Ignoring request.");
            return;
        }

        this._setMorphTargetData(targetDataIndex)

        // Tween Uniforms
        const morphData = this._getMorphData(targetDataIndex);
        const easing = BACK_OUT_DEFAULT;
        // const easing = TWEEN.Easing.Cubic.In;
        if (morphData && morphData.targetUniforms) {
            for (const key in morphData.targetUniforms) {
                if (this.material.uniforms[key]) {
                    const uProp = this.material.uniforms[key];
                    const targetVal = morphData.targetUniforms[key].value;

                    if (typeof targetVal === 'boolean') {
                        uProp.value = targetVal;
                    } else if (typeof targetVal === 'number') {
                        new TWEEN.Tween(uProp)
                            .to({ value: targetVal }, MORPH_DURATION)
                            .easing(easing)
                            .start();
                    } else if (targetVal && (targetVal.isVector2 || targetVal.isVector3 || targetVal.isColor)) {
                        new TWEEN.Tween(uProp.value)
                            .to(targetVal, MORPH_DURATION)
                            .easing(easing)
                            .start();
                    }
                }
            }
        }





        new TWEEN.Tween(this.material.uniforms.uProgress)
            .to({ value: 1.0 }, MORPH_DURATION)
            .easing(easing)
            .onComplete(() => {
                let material = this.material;
                let geometry = this.points.geometry;
                // console.log(this.material.uniforms)

                // assign all start attribute to current attribute
                geometry.setAttribute('position', geometry.attributes.aTargetPos); // STOP updating position to avoid bounding box shrinking

                geometry.setAttribute('position', geometry.attributes.aTargetPos);
                geometry.setAttribute('aStartColor', geometry.attributes.aTargetColor);
                geometry.setAttribute('aStartSizeIsGrid', geometry.attributes.aTargetSizeIsGrid);
                geometry.setAttribute('aStartNormal', geometry.attributes.aTargetNormal);
                if (geometry.attributes.aTargetSkinWeight) geometry.setAttribute('aStartSkinWeight', geometry.attributes.aTargetSkinWeight);

                material.uniforms.uProgress.value = 0.0;

                geometry.attributes.position.needsUpdate = true;
                geometry.attributes.aStartColor.needsUpdate = true;
                geometry.attributes.aStartSizeIsGrid.needsUpdate = true;
                geometry.attributes.aStartNormal.needsUpdate = true;
                if (geometry.attributes.aStartSkinWeight) geometry.attributes.aStartSkinWeight.needsUpdate = true;

                // Update Uniforms from Target Data
                const morphData = this._getMorphData(targetDataIndex);
                if (morphData && morphData.targetUniforms) {
                    for (const key in morphData.targetUniforms) {
                        if (material.uniforms[key]) {
                            const dest = material.uniforms[key].value;
                            const src = morphData.targetUniforms[key].value;
                            if (dest && dest.isColor) {
                                dest.set(src);
                            } else if (dest && dest.copy && typeof dest.copy === 'function') {
                                dest.copy(src);
                            } else {
                                material.uniforms[key].value = src;
                            }
                        }
                    }
                }

                geometry.morphCurrentIndex = targetDataIndex;

                // Reset uProgress on the NEXT frame to ensure geometry attributes are fully updated/uploaded first.
                // This prevents a single-frame "Flash" of the old state.
                // requestAnimationFrame(() => {
                //     material.uniforms.uProgress.value = 0.0;
                //     console.log(`Morph to index ${targetDataIndex} complete.`);
                // });

            })
            .start();
    }

    playAnimation(clipName, duration = 0.5, loop = true) {
        if (!this.mixer || !this.scene.heroClips) return;

        const clip = THREE.AnimationClip.findByName(this.scene.heroClips, clipName);
        if (!clip) {
            console.warn(`Animation clip '${clipName}' not found in heroClips.`);
            return;
        }

        const newAction = this.mixer.clipAction(clip);

        // Log the animation name being played
        console.log(`[Points] Playing Animation: ${clipName} (loop: ${loop})`);

        // Handle crossfade if there's an active action
        if (this.activeAction && this.activeAction !== newAction) {
            this.activeAction.fadeOut(duration);
        }

        newAction.reset();
        newAction.setEffectiveWeight(1);

        if (!loop) {
            newAction.setLoop(THREE.LoopOnce);
            newAction.clampWhenFinished = true; // Crucial: don't snap back to start
        } else {
            newAction.setLoop(THREE.LoopRepeat);
        }

        newAction.fadeIn(duration);
        newAction.play();

        this.activeAction = newAction;
    }

    /**
     * Smoothly stops all active animations.
     */
    stopAnimations(duration = 0.5) {
        if (!this.mixer || !this.activeAction) return;
        console.log(`[Points] Stopping animations...`);
        this.activeAction.fadeOut(duration);
        this.activeAction = null;
    }
    loadModel() {
        if (resources.roomModel) {
            const gltf = resources.roomModel;
            this.model = SkeletonUtils.clone(gltf.scene); // Clone to avoid scene graph mutation issues

            // Hide the base model - it's only used for raycasting/reference
            this.model.traverse(child => {
                if (child.isMesh) {
                    child.visible = true; // MUST be true for raycasting to work
                    if (child.material) {
                        child.material.visible = false; // Hide from renderer
                    }
                }
            });
            this.scene.add(this.model);

            // Setup Animation Mixer
            if (gltf.animations && gltf.animations.length > 0) {
                this.mixer = new THREE.AnimationMixer(this.model); // Use the CLONED model
            }

            // Define Morph Targets (Configs)
            this._addMorphDataByModelName("root", {
                uModelScale: { value: 4.4 },
                uSizeThreshold: { value: 13.6 },
                uVibrateBoostSizeThreshold: { value: 8.0 },
                uIsChaos: { value: 0.0 },
                uModelScreenOffset: { value: new THREE.Vector2(0.2, 0) },
                uModelVibFactor: { value: 6.0 },
                uIsArmatureState: { value: 0.0 },
                uAttractionForce: { value: 0.0 }, // No attraction
                uLightSizeBoost: { value: 2.5 }
            });

            this._addMorphDataByModelName('a-char', {
                uModelScale: { value: 0.25 },
                // uModelPosition: { value: new THREE.Vector3(0, -9.0, 0) }, // Default position
                uModelRotation: { value: new THREE.Vector3(Math.PI / 2, -1.15, 0) },
                uIsChaos: { value: 0.0 },
                uModelScreenOffset: { value: new THREE.Vector2(0.4, -0.8) },
                uEnableMouseRotation: { value: false },
                uGridZ: { value: -800 },
                uModelPointSizeFactor: { value: 1.2 },
                uIsArmatureState: { value: 1.0 }, // Enable attraction logic
                uAttractionForce: { value: 1000.0 }, // Default attraction force
                uAttractionRefSize: { value: 12.0 }, // Lower = Heavier = More stable
                uAttractionRadius: { value: 2000.0 }, // Attraction interaction range
                uLightSizeBoost: { value: 0.5 }
            });

            // Loading Complete UI
            // Loading Complete UI - Simulate Progress
            let currentProgress = 0;
            const simulateLoading = () => {
                if (!this.options.enableUI) return;

                if (currentProgress >= 100) {
                    this.progressText.innerText = '100%';
                    this.progressBar.style.width = '100%';

                    setTimeout(() => {
                        this.progressText.style.display = 'none';
                        this.progressBarContainer.style.display = 'none';
                        this.enterBtn.style.display = 'block';
                        this.controlsWrapper.style.display = 'flex';
                    }, 500);
                    return;
                }

                currentProgress += 1.5; // Speed of loading
                if (currentProgress > 100) currentProgress = 100;

                this.progressText.innerText = Math.floor(currentProgress) + '%';
                this.progressBar.style.width = currentProgress + '%';

                requestAnimationFrame(simulateLoading);
            };

            simulateLoading();
            return;
        } else {
            console.error("Hero Model not found in resources!");
        }
    }

    createBackgroundParticles() {
        // const starTexture = this.createStarTexture();

        // Initialize Material with default uniforms
        this.material = new THREE.ShaderMaterial({
            uniforms: this.shaderUniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            depthWrite: false,
            // blending: THREE.AdditiveBlending 
            skinning: true
        });

        // Create 100k points for background
        const count = this.pointCap;
        const randomPositions = new Float32Array(count * 3);
        const targetPositions = new Float32Array(count * 3); // Placeholders

        // PACKED ATTRIBUTES: [Size, IsGrid]
        const startSizeIsGrid = new Float32Array(count * 2);
        const targetSizeIsGrid = new Float32Array(count * 2);

        const startColors = new Float32Array(count * 3);
        const targetColors = new Float32Array(count * 3);
        const stableRandoms = new Float32Array(count); // Stable random seed


        // Grid/Scatter Logic
        const gridSide = Math.ceil(Math.sqrt(count)) || 1;
        const camPos = new THREE.Vector3(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);
        const target = new THREE.Vector3(0, 0, 0);
        const forward = new THREE.Vector3().subVectors(target, camPos).normalize();
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
        const up = new THREE.Vector3().crossVectors(right, forward).normalize();
        const gridOrigin = forward.clone().multiplyScalar(-gridZ);
        const tempVec = new THREE.Vector3();
        const baseColorObj = new THREE.Color('#ffffff');

        for (let i = 0; i < count; i++) {
            // ... (Scatter logic remains same)

            stableRandoms[i] = Math.random();

            // Random scatter
            randomPositions[i * 3 + 0] = (Math.random() * 2.0 - 1.0) * scatterRangeGrid;
            randomPositions[i * 3 + 1] = (Math.random() * 2.0 - 1.0) * scatterRangeGrid;
            randomPositions[i * 3 + 2] = (Math.random() * 2.0 - 1.0) * scatterRangeGrid;

            // ... (Target Position logic remains same)
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

            // PACKED: Size + IsGrid
            const size = GRID_SIZE;
            const isGridVal = 1.0;

            startSizeIsGrid[i * 2 + 0] = size;
            startSizeIsGrid[i * 2 + 1] = isGridVal;

            targetSizeIsGrid[i * 2 + 0] = size;
            targetSizeIsGrid[i * 2 + 1] = isGridVal;

            // Default color (White/Base)
            startColors[i * 3 + 0] = baseColorObj.r;
            startColors[i * 3 + 1] = baseColorObj.g;
            startColors[i * 3 + 2] = baseColorObj.b;

            targetColors[i * 3 + 0] = baseColorObj.r;
            targetColors[i * 3 + 1] = baseColorObj.g;
            targetColors[i * 3 + 2] = baseColorObj.b;
        }

        const geometry = new THREE.BufferGeometry();

        // --- Position ---
        const startPosAttr = new THREE.Float32BufferAttribute(randomPositions, 3);
        const targetPosAttr = new THREE.Float32BufferAttribute(targetPositions, 3);
        geometry.setAttribute('position', startPosAttr);
        geometry.setAttribute('aTargetPos', targetPosAttr);

        // --- SizeIsGrid (Packed) ---
        const startSizeIsGridAttr = new THREE.Float32BufferAttribute(startSizeIsGrid, 2);
        const targetSizeIsGridAttr = new THREE.Float32BufferAttribute(targetSizeIsGrid, 2);
        geometry.setAttribute('aStartSizeIsGrid', startSizeIsGridAttr);
        geometry.setAttribute('aTargetSizeIsGrid', targetSizeIsGridAttr);

        // --- Color ---
        const startColorAttr = new THREE.Float32BufferAttribute(startColors, 3);
        const targetColorAttr = new THREE.Float32BufferAttribute(targetColors, 3);
        geometry.setAttribute('aStartColor', startColorAttr);
        geometry.setAttribute('aTargetColor', targetColorAttr);

        // --- Normal ---
        // Start and Target Normals
        const startNormals = new Float32Array(count * 3).fill(0);
        const targetNormals = new Float32Array(count * 3).fill(0);

        const startNormalAttr = new THREE.Float32BufferAttribute(startNormals, 3);
        const targetNormalAttr = new THREE.Float32BufferAttribute(targetNormals, 3);
        geometry.setAttribute('aStartNormal', startNormalAttr);
        geometry.setAttribute('aTargetNormal', targetNormalAttr);

        // --- IsGrid --- REMOVED (Packed above)

        // --- Stable Index ---
        geometry.setAttribute('aStableRandom', new THREE.Float32BufferAttribute(stableRandoms, 1));

        // --- SKINNING (Manual) ---
        const startSkinWeights = new Float32Array(count * 4).fill(0);
        const targetSkinWeights = new Float32Array(count * 4).fill(0);
        const skinIndices = new Uint16Array(count * 4).fill(0);

        const startSkinWeightAttr = new THREE.Float32BufferAttribute(startSkinWeights, 4);
        const targetSkinWeightAttr = new THREE.Float32BufferAttribute(targetSkinWeights, 4);
        const skinIndexAttr = new THREE.Uint16BufferAttribute(skinIndices, 4);

        geometry.setAttribute('aStartSkinWeight', startSkinWeightAttr);
        geometry.setAttribute('aTargetSkinWeight', targetSkinWeightAttr);
        geometry.setAttribute('skinIndex', skinIndexAttr);

        this.points = new THREE.Points(geometry, this.material);
        linkConstantUniforms(this.material, 'uProgress')
        console.log(this.material.uniforms);

        this.points.frustumCulled = false; // Disable culling explicitly
        geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 5000.0); // Create huge bounding sphere to prevent any culling calculations
        // geometry.center(); // Don't center, keep explicit positions
        this.points.name = 'PointsCloud';
        this.points.parentInstance = this; // Back-reference for Tooltip logic
        this.scene.add(this.points);

        // add morph data named chaos
        const chaosData = {
            targetPosAttr: startPosAttr,
            targetColorAttr: startColorAttr,
            targetSizeIsGridAttr: startSizeIsGridAttr,
            targetNormalAttr: startNormalAttr,
            targetSkinIndexAttr: skinIndexAttr,
            targetSkinWeightAttr: targetSkinWeightAttr // 0s
        }
        this.addMorphData("chaos", chaosData, this.userData.chaosUniforms);
        // this.addMorphData("grid", { targetPosAttr, targetColorAttr, targetSizeAttr, targetIsGridAttr, targetNormalAttr });
    }



    _addMorphDataByModelName(name, uniformOverrides = {}) {
        // Merge overrides with default chaos uniforms to ensure complete state
        const modelUniforms = THREE.UniformsUtils.clone(this.userData.chaosUniforms);
        for (const key in uniformOverrides) {
            if (modelUniforms[key]) {
                modelUniforms[key].value = uniformOverrides[key].value;
            }
        }
        // Collect Meshes
        const baseModel = this.model.getObjectByName(name);
        if (!baseModel) return;

        const meshes = [];
        baseModel.traverse((child) => {
            if (child.isMesh) {
                child.updateMatrixWorld(true); // Ensure world matrix is up to date
                meshes.push(child);
            }
        });

        const count = this.pointCap;
        // const geometry = this.points.geometry;
        const baseData = this._getMorphData(0);

        const targetPositions = new Float32Array(baseData.targetPosAttr.array);
        const targetSizeIsGrid = new Float32Array(baseData.targetSizeIsGridAttr.array);
        const targetNormals = new Float32Array(baseData.targetNormalAttr.array);
        const targetColors = new Float32Array(baseData.targetColorAttr.array);
        // Custom Skinning attributes
        const targetSkinIndices = new Float32Array(count * 4); // 4 indices per point, Float32 to match vec4 expectation
        const targetSkinWeights = new Float32Array(count * 4); // 4 weights per point

        let foundSkeleton = null;
        let foundBindMatrix = null;
        let foundBindMatrixInverse = null;

        let currentPointIndex = 0;
        let totalModelVertices = 0;

        const tempVec = new THREE.Vector3();
        const tempNormal = new THREE.Vector3();
        const normalMatrix = new THREE.Matrix3();
        const baseColorObj = new THREE.Color('#ffffff');

        for (let m = 0; m < meshes.length; m++) {
            const mesh = meshes[m];
            const worldMatrix = mesh.matrixWorld;
            normalMatrix.getNormalMatrix(worldMatrix);

            // Capture skeleton if found
            if (mesh.skeleton && !foundSkeleton) {
                foundSkeleton = mesh.skeleton;
                foundBindMatrix = mesh.bindMatrix;
                foundBindMatrixInverse = mesh.bindMatrixInverse;
            }

            const originalGeometry = mesh.geometry;
            const originalPosAttr = originalGeometry.attributes.position;
            const originalNormals = originalGeometry.attributes.normal;

            // Skinning Source
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

                // Position
                if (foundSkeleton) {
                    // SKINNED MESH: Keep in Local Space (Bind Matrix expects this)
                    targetPositions[currentPointIndex * 3 + 0] = originalPosAttr.getX(i);
                    targetPositions[currentPointIndex * 3 + 1] = originalPosAttr.getY(i);
                    targetPositions[currentPointIndex * 3 + 2] = originalPosAttr.getZ(i);
                } else {
                    // STATIC MESH: Bake World Matrix (so it appears in place)
                    tempVec.set(originalPosAttr.getX(i), originalPosAttr.getY(i), originalPosAttr.getZ(i));
                    tempVec.applyMatrix4(worldMatrix);
                    targetPositions[currentPointIndex * 3 + 0] = tempVec.x;
                    targetPositions[currentPointIndex * 3 + 1] = tempVec.y;
                    targetPositions[currentPointIndex * 3 + 2] = tempVec.z;
                }

                // Normal
                if (originalNormals) {
                    if (foundSkeleton) {
                        // SKINNED: Local Normal
                        targetNormals[currentPointIndex * 3 + 0] = originalNormals.getX(i);
                        targetNormals[currentPointIndex * 3 + 1] = originalNormals.getY(i);
                        targetNormals[currentPointIndex * 3 + 2] = originalNormals.getZ(i);
                    } else {
                        // STATIC: World Normal
                        tempNormal.set(originalNormals.getX(i), originalNormals.getY(i), originalNormals.getZ(i));
                        tempNormal.applyMatrix3(normalMatrix).normalize();
                        targetNormals[currentPointIndex * 3 + 0] = tempNormal.x;
                        targetNormals[currentPointIndex * 3 + 1] = tempNormal.y;
                        targetNormals[currentPointIndex * 3 + 2] = tempNormal.z;
                    }
                }

                // Skinning (Copy directly)
                if (originalSkinIndex) {
                    targetSkinIndices[currentPointIndex * 4 + 0] = originalSkinIndex.getX(i);
                    targetSkinIndices[currentPointIndex * 4 + 1] = originalSkinIndex.getY(i);
                    targetSkinIndices[currentPointIndex * 4 + 2] = originalSkinIndex.getZ(i);
                    targetSkinIndices[currentPointIndex * 4 + 3] = originalSkinIndex.getW(i);
                }
                if (originalSkinWeight) {
                    targetSkinWeights[currentPointIndex * 4 + 0] = originalSkinWeight.getX(i);
                    targetSkinWeights[currentPointIndex * 4 + 1] = originalSkinWeight.getY(i);
                    targetSkinWeights[currentPointIndex * 4 + 2] = originalSkinWeight.getZ(i);
                    targetSkinWeights[currentPointIndex * 4 + 3] = originalSkinWeight.getW(i);
                }

                // PACKED: Size + IsGrid
                targetSizeIsGrid[currentPointIndex * 2 + 0] = 0.5 + Math.pow(Math.random(), 0.7) * 15.5; // Size
                targetSizeIsGrid[currentPointIndex * 2 + 1] = 0.0; // IsGrid


                targetColors[currentPointIndex * 3 + 0] = meshColor.x * brightness;
                targetColors[currentPointIndex * 3 + 1] = meshColor.y * brightness;
                targetColors[currentPointIndex * 3 + 2] = meshColor.z * brightness;

                // const range = scatterRangeModel;
                // posAttr block removed

                currentPointIndex++;
            }
        }

        const modelPointCount = currentPointIndex;
        // geometry.attributes.aStartPos.needsUpdate = true;
        // geometry.attributes.aTargetNormal.needsUpdate = true;
        // geometry.attributes.aTargetColor.needsUpdate = true;

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
        const offset = (modelUniforms.uModelScreenOffset) ? modelUniforms.uModelScreenOffset.value : this.material.uniforms.uModelScreenOffset.value;
        const scale = (modelUniforms.uModelScale) ? modelUniforms.uModelScale.value : this.material.uniforms.uModelScale.value;
        const rot = (modelUniforms.uModelRotation) ? modelUniforms.uModelRotation.value : this.material.uniforms.uModelRotation.value;

        // Construct Rotation Matrix (Z * Y * X) to match shader
        const mX = new THREE.Matrix4().makeRotationX(rot.x);
        const mY = new THREE.Matrix4().makeRotationY(rot.y);
        const mZ = new THREE.Matrix4().makeRotationZ(rot.z);
        const mR = mZ.clone().multiply(mY).multiply(mX);

        const ndcVec = new THREE.Vector3();
        const modelGapCells = Math.ceil((GAP_SIZE * 3.0) / gridSpacing);

        this.camera.updateMatrixWorld();
        this.camera.updateProjectionMatrix();

        for (let i = 0; i < modelPointCount; i++) {
            // point is at targetPositions[i]
            tempVec.set(targetPositions[i * 3 + 0], targetPositions[i * 3 + 1], targetPositions[i * 3 + 2]);

            // Apply Shader Transformations (Scale then Rotate)
            tempVec.multiplyScalar(scale);
            tempVec.applyMatrix4(mR);

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
                targetSizeIsGrid[i * 2 + 0] = 0.0; // Size
                targetSizeIsGrid[i * 2 + 1] = 0.0; // IsGrid (hidden)
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
                targetSizeIsGrid[i * 2 + 0] = GRID_SIZE; // Size
                targetSizeIsGrid[i * 2 + 1] = nearHalo ? 25.0 : 2.0; // IsGrid
            }
            // Restore grid color (White)
            targetColors[i * 3 + 0] = baseColorObj.r;
            targetColors[i * 3 + 1] = baseColorObj.g;
            targetColors[i * 3 + 2] = baseColorObj.b;
        }

        // Create new attributes
        const newTargetPosAttr = new THREE.Float32BufferAttribute(targetPositions, 3);
        const newTargetSizeIsGridAttr = new THREE.Float32BufferAttribute(targetSizeIsGrid, 2);
        const newTargetNormalAttr = new THREE.Float32BufferAttribute(targetNormals, 3);
        const newTargetColorAttr = new THREE.Float32BufferAttribute(targetColors, 3);

        // Define Skin Attributes
        const targetSkinIndicesAttr = new THREE.Float32BufferAttribute(targetSkinIndices, 4);
        const targetSkinWeightsAttr = new THREE.Float32BufferAttribute(targetSkinWeights, 4);

        const data = {
            targetPosAttr: newTargetPosAttr,
            targetSizeIsGridAttr: newTargetSizeIsGridAttr,
            targetNormalAttr: newTargetNormalAttr,
            targetColorAttr: newTargetColorAttr,
            targetSkinIndexAttr: targetSkinIndicesAttr,
            targetSkinWeightAttr: targetSkinWeightsAttr,
            targetSkeleton: foundSkeleton,
            targetBindMatrix: foundBindMatrix,
            targetBindMatrixInverse: foundBindMatrixInverse
        };

        this.addMorphData(name, data, modelUniforms);
    }

    createControlUI() {
        createUIFromModule({
            material: this.material,
            bloomPass: this.bloomPass,
            TWEEN,
            MORPH_DURATION,
            DEFAULT_VIBRATE_AMPLITUDE: 0.25,
            DEFAULT_SIZE_THRESHOLD: 18.0,
            DEFAULT_VIBRATE_BOOST_SIZE_THRESHOLD: 35.0,
            POINT_SIZE: 0.03,
            UI_WIDTH,
            UI_TOP,
            UI_RIGHT,
            speed: this.material.uniforms.uBaseRotateSpeed,
            hoverEffect: this.material.uniforms.uHoverRadius,
            mouseDamping,
            pointReturnSpeed,
            onStart: () => {
                const isGoingToModel = this.material.uniforms.uProgress.value < 0.5;
                const targetThreshold = isGoingToModel ? MODEL_SIZE_THRESHOLD : 18.0;

                new TWEEN.Tween(this.material.uniforms.uSizeThreshold)
                    .to({ value: targetThreshold }, MORPH_DURATION)
                    .easing(BACK_OUT_DEFAULT)
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
        this.rawMouse.set(event.clientX, event.clientY);
        this.targetMouse.copy(this.mouse);
        this.lastMouseMoveTime = performance.now();

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

    // _getPointInfo has been moved to tooltip.js

    update(shouldUpdateTween = true) {
        if (shouldUpdateTween) TWEEN.update();
        if (this.controls) this.controls.update();

        if (this.mixer) {
            this.mixer.update(this.clock.getDelta());

            // Sync model transform with shader uniforms (for accurate raycasting)
            if (this.model && this.material.uniforms.uModelScale) {
                const uScale = this.material.uniforms.uModelScale.value;
                const uPos = this.material.uniforms.uModelPosition.value;
                const uRot = this.material.uniforms.uModelRotation.value;

                this.model.scale.setScalar(uScale);
                this.model.position.copy(uPos);
                // The shader uses a specific rotation order (Z*Y*X in matrix calc often corresponds to XYZ or YXZ depending on logic)
                // In our shader we usually keep it simple or match Three.js default XYZ.
                this.model.rotation.set(uRot.x, uRot.y, uRot.z);
            }

            if (this.model) this.model.updateMatrixWorld(true);

            // Force skeleton update since Points doesn't do it automatically
            if (this.points.skeleton && this.points.isSkinnedMesh) {
                this.points.skeleton.update();
            }
        }

        // Smooth damping of mouse
        this.smoothMouse.x += (this.targetMouse.x - this.smoothMouse.x) * mouseDamping.value;
        this.smoothMouse.y += (this.targetMouse.y - this.smoothMouse.y) * mouseDamping.value;

        // Separate slower smoothing for repulsion effect
        this.smoothRepulsionMouse.x += (this.targetMouse.x - this.smoothRepulsionMouse.x) * pointReturnSpeed.value;
        this.smoothRepulsionMouse.y += (this.targetMouse.y - this.smoothRepulsionMouse.y) * pointReturnSpeed.value;

        this.raycaster.setFromCamera(this.smoothMouse, this.camera);

        // Delegate Tooltip Logic
        const currentMorphIndex = this.points.geometry.morphCurrentIndex;

        // 1. State Check: Only Chaos (0) or Root (1)
        const isCorrectState = (currentMorphIndex === undefined || currentMorphIndex <= 1);

        // 2. Morph Check: Not while morphing
        // uProgress goes from 0 to 1 during morph. Stabilizes at 0 or 1.
        // We consider "morphing" if it's not close to limits.
        const prog = this.material.uniforms.uProgress.value;
        const isStable = (prog < 0.1 || prog > 0.9);

        // 3. Mouse Dwell Check: Not while moving/busy
        const now = performance.now();
        const timeSinceMove = now - (this.lastMouseMoveTime || 0);
        const isMouseResting = timeSinceMove > 40; // 40ms dwell time (Faster response)

        // Combined Condition
        const isTooltipEnabled = isCorrectState && isStable && isMouseResting;

        if (this.tooltip) {
            if (isTooltipEnabled) {
                this.tooltip.update(
                    this.raycaster,
                    this.points,
                    this.material,
                    this.smoothMouse,
                    this.rawMouse,
                    this.camera
                );
                // Cache the last detected index to help the area-hover logic
                if (this.tooltip.lastHoveredIndex !== -1) {
                    this.points.geometry.lastClosestIndex = this.tooltip.lastHoveredIndex;
                }
            } else {
                this.tooltip.hide();
            }
        }

        const intersects = this.raycaster.intersectObject(this.intersectionPlane);

        if (this.material) {
            const elapsedTime = this.clock.getElapsedTime();
            this.material.uniforms.iTime.value = elapsedTime;

            if (intersects.length > 0) {
                this.material.uniforms.uMousePos.value.copy(intersects[0].point);
            }


            // Use slower-smoothed position for repulsion to control point return speed
            if (this.material.uniforms.uMouseNDC) this.material.uniforms.uMouseNDC.value.copy(this.smoothRepulsionMouse);

            // Smoothly blend in mouse interactions as the morph completes
            // interactionStrength goes from 0.0 to 1.0 as uProgress goes from 0.8 to 1.0


            const interactionStrength = 1;

            // Update Rotation based on X mouse position
            if (this.material.uniforms.uModelRotation && this.material.uniforms.uEnableMouseRotation && this.material.uniforms.uEnableMouseRotation.value) {
                this.material.uniforms.uModelRotation.value.y = this.smoothMouse.x * -0.13 * interactionStrength;
            }

            // Update Light Direction Y based on Mouse Y
            if (this.material.uniforms.uLightDir) {
                // Base Y is -100.0. Target varies by +/- 100 based on mouse.
                const targetLightY = -100.0 + this.smoothMouse.y * 100.0;
                // Lerp between base (-100) and target based on interactionStrength
                this.material.uniforms.uLightDir.value.y = -100.0 + (targetLightY - (-100.0)) * interactionStrength;
            }

            // Smoothing logic for attraction falloff (Remove the Snap)
            if (this.model && currentMorphIndex >= 1) {
                const intersects = this.raycaster.intersectObject(this.model, true);
                const isOver = intersects.length > 0;

                // Get the target force for this state
                const morphData = this._getMorphData(currentMorphIndex);
                const targetForce = (morphData && morphData.targetUniforms && morphData.targetUniforms.uAttractionForce)
                    ? morphData.targetUniforms.uAttractionForce.value
                    : 0.0;

                if (isOver) {
                    // Inside the model: Target force is 0.0
                    if (!this._mouseWasOverModel) console.log('Mouse over GLB Points Area');

                    // Smoothly lerp DOWN to 0.0 to prevent "Snap" when entering
                    const currentForce = this.material.uniforms.uAttractionForce.value;
                    this.material.uniforms.uAttractionForce.value += (0.0 - currentForce) * 0.1;
                } else {
                    // Outside the model: Target force is the Morph Default (e.g. 1000)
                    const currentForce = this.material.uniforms.uAttractionForce.value;
                    this.material.uniforms.uAttractionForce.value += (targetForce - currentForce) * 0.1; // Smooth recovery
                }
                this._mouseWasOverModel = isOver;
            }
        }

        this.composer.render();
    }
}
