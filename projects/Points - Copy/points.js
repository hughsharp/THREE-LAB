import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';
import { createUI as createUIFromModule } from './ui.js';

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const MODEL_PATH = './models/photo004.glb';
const BASE_COLOR = '#ffffff';

// Point rendering
const POINT_SIZE = 0.00015;
const DEFAULT_VIBRATE_AMPLITUDE = 0.0015;
const DEFAULT_SIZE_THRESHOLD = 14.0;
const DEFAULT_VIBRATE_BOOST_SIZE_THRESHOLD = 25.0;

// Camera
const CAMERA_FOV = 45;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 300;
const CAMERA_POSITION = { x: 61.56, y: 2.97, z: 88 };

// Scene
const SCENE_BACKGROUND = '#000000';

// Renderer
const RENDERER_DPR_MAX = 2;

// Postprocessing (Bloom)
const BLOOM_STRENGTH = 1.15;
const BLOOM_RADIUS = 0.4;
const BLOOM_THRESHOLD = 0.8;

// Light defaults
const LIGHT_DIR_X = 20.0;
const LIGHT_DIR_Y = -12.0;
const LIGHT_DIR_Z = -20.7;
const LIGHT_STRENGTH = 1.0;
const LIGHT_SIZE_BOOST = 3.0;

// UI controls
const UI_WIDTH = '200px';
const UI_TOP = '20px';
const UI_RIGHT = '20px';
const MORPH_DURATION = 2500;

// ============================================================================
// SCENE SETUP
// ============================================================================
const scene = new THREE.Scene();

// Create canvas gradient background (black to white with sharp transition in middle)
const canvas = document.createElement('canvas');
canvas.width = 1024;
canvas.height = 1024;
const ctx = canvas.getContext('2d');

// Create gradient: black on left, smooth transition in middle, white on right

const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    CAMERA_NEAR,
    CAMERA_FAR
);
camera.position.set(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDERER_DPR_MAX));
document.body.appendChild(renderer.domElement);

// ============================================================================
// POSTPROCESSING (BLOOM EFFECT)
// ============================================================================
let composer;
let bloomPass;

function initPostprocessing() {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        BLOOM_STRENGTH,
        BLOOM_RADIUS,
        BLOOM_THRESHOLD
    );
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
}
initPostprocessing();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Log camera position on change
// controls.addEventListener('change', () => {
//     const p = camera.position;
//     console.log(`Camera position -> x: ${p.x.toFixed(2)}, y: ${p.y.toFixed(2)}, z: ${p.z.toFixed(2)}`);
// });

// ============================================================================
// SHADERS
// ============================================================================
const vertexShader = `
    precision highp float;
    varying vec3 vNormal;
    // per-vertex size
    attribute float aSize;
    uniform float uSize;
    uniform float uPixelRatio;
    // lighting used to scale sizes
    uniform vec3 uLightDir;
    uniform float uLightSizeBoost;
    // vibration
    attribute vec3 aRandom;
    uniform float iTime;
    uniform float uVibrateAmp;
    // morphing from random to target positions
    attribute vec3 aTargetPos;
    uniform float uProgress;
    uniform float uVibrateBoostSizeThreshold;
        varying float vComputedSize;
    
    void main() {
        vNormal = normal;

        // compute a small jitter per-vertex using the per-vertex random seed
        vec3 jitterBase = vec3(
            sin(iTime * 5.0 + aRandom.x * 10.0),
            sin(iTime * 5.5 + aRandom.y * 10.0),
            sin(iTime * 4.5 + aRandom.z * 10.0)
        );
        // gl_Position will be set after we compute mvPosition below
        
        // compute per-vertex lighting factor in view space to scale sizes
        vec3 normalView = normalize(normalMatrix * normal);
        vec3 lightDirView = normalize((viewMatrix * vec4(uLightDir, 0.0)).xyz);
        float lightFactor = max(0.0, dot(normalView, lightDirView));

        // size multiplier based on how exposed the point is to the light
        float sizeFromLight = 1.0 + lightFactor * uLightSizeBoost;

        // combine per-vertex aSize (our large distribution) with the light multiplier
        float computedSize = aSize * sizeFromLight + uSize * 20.0;
        vComputedSize = computedSize;

        // Smoothly amplify vibration for smaller points.
        // The boost scales from 1.0 (no boost) up to maxBoost as computedSize
        // goes from the threshold down to 0. This avoids a hard step and
        // produces a smooth transition.
        float maxBoost = 6.0;
        float t = clamp((uVibrateBoostSizeThreshold - computedSize) / uVibrateBoostSizeThreshold, 0.0, 40.0);
        t = smoothstep(0.0, 1.0, t);
        float vibBoost = mix(1.0, maxBoost, t);
        vec3 jitter = jitterBase * uVibrateAmp * vibBoost;

        // Morph from random position (aRandom scaled) to target position (aTargetPos)
        vec3 randomPos = aRandom * 50.0;  // scale random values to position space
        vec3 morphedPos = mix(randomPos, aTargetPos, uProgress);
        vec3 displaced = morphedPos + jitter;

        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = computedSize * uPixelRatio * (20.0 / -mvPosition.z);
    }
`;

const fragmentShader = `
    precision highp float;
    varying vec3 vNormal;
    varying float vComputedSize;
    uniform vec3 uColor;
    
    // 1. NEW UNIFORM DEFINITIONS
    uniform vec3 uLightDir; 
    uniform float uLightStrength;
    uniform float uSizeThreshold;
    
    void main() {
        // hide entire point if its computed size (from vertex) is below threshold
        if (vComputedSize < uSizeThreshold) discard;
        float distanceToCenter = length(gl_PointCoord - vec2(0.5));
        if (distanceToCenter > 0.5) discard;
        
        // 2. USE THE UNIFORMS
        // We normalize the light direction to ensure consistent dot product
        vec3 lightDirection = normalize(uLightDir);
        
        // Dot Product calculation scaled by uLightStrength. Keep a small
        // ambient floor so points never go completely black.
        float lightIntensity = max(0.05, dot(vNormal, lightDirection) * uLightStrength);

        vec3 finalColor = uColor * lightIntensity;

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

// ============================================================================
// MATERIAL & LOADER
// ============================================================================
let material;
const loader = new GLTFLoader();

loader.load(MODEL_PATH, (gltf) => {

    material = new THREE.ShaderMaterial({
        uniforms: {
            uSize: { value: POINT_SIZE },
            uColor: { value: new THREE.Color(BASE_COLOR) },
            uPixelRatio: { value: 1.0 },
            uLightDir: { value: new THREE.Vector3(LIGHT_DIR_X, LIGHT_DIR_Y, LIGHT_DIR_Z) },
            iTime: { value: 0.0 },
            uVibrateAmp: { value: DEFAULT_VIBRATE_AMPLITUDE },
            uProgress: { value: 0.0 },
            uLightStrength: { value: LIGHT_STRENGTH },
            uLightSizeBoost: { value: LIGHT_SIZE_BOOST },
            uSizeThreshold: { value: DEFAULT_SIZE_THRESHOLD },
            uVibrateBoostSizeThreshold: { value: DEFAULT_VIBRATE_BOOST_SIZE_THRESHOLD }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        depthWrite: false,
    });

    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            const geometry = child.geometry;

            // add per-vertex size and random seed attributes if positions exist
            if (geometry && geometry.attributes && geometry.attributes.position) {
                const count = geometry.attributes.position.count;
                const posAttr = geometry.attributes.position;

                const sizes = new Float32Array(count);
                const randoms = new Float32Array(count * 3);
                const targetPositions = new Float32Array(count * 3);
                const randomPositions = new Float32Array(count * 3);

                for (let i = 0; i < count; i++) {
                    // Create a much wider size distribution so points vary visibly.
                    const largeRandom = 0.5 + Math.pow(Math.random(), 0.7) * 15.5;
                    sizes[i] = largeRandom;

                    randoms[i * 3 + 0] = Math.random() * 2.0 - 1.0;
                    randoms[i * 3 + 1] = Math.random() * 2.0 - 1.0;
                    randoms[i * 3 + 2] = Math.random() * 2.0 - 1.0;

                    // Store original (target) positions from the GLB
                    targetPositions[i * 3 + 0] = posAttr.getX(i);
                    targetPositions[i * 3 + 1] = posAttr.getY(i);
                    targetPositions[i * 3 + 2] = posAttr.getZ(i);

                    // Generate random start positions
                    randomPositions[i * 3 + 0] = (Math.random() * 2.0 - 1.0) * 50.0;
                    randomPositions[i * 3 + 1] = (Math.random() * 2.0 - 1.0) * 50.0;
                    randomPositions[i * 3 + 2] = (Math.random() * 2.0 - 1.0) * 50.0;
                }

                geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
                geometry.setAttribute('aRandom', new THREE.Float32BufferAttribute(randoms, 3));
                geometry.setAttribute('aTargetPos', new THREE.Float32BufferAttribute(targetPositions, 3));
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(randomPositions, 3));
            }

            const points = new THREE.Points(geometry, material);

            // points.scale.setScalar(50);
            geometry.center();

            scene.add(points);
        }
    });

    createUIFromModule({
        material,
        bloomPass,
        TWEEN,
        MORPH_DURATION,
        DEFAULT_VIBRATE_AMPLITUDE,
        DEFAULT_SIZE_THRESHOLD,
        DEFAULT_VIBRATE_BOOST_SIZE_THRESHOLD,
        POINT_SIZE,
        UI_WIDTH,
        UI_TOP,
        UI_RIGHT
    });

}, undefined, (err) => {
    console.error('Error loading model:', err);
});


// ============================================================================
// ANIMATION LOOP
// ============================================================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();
    // update time uniform for vibration
    if (material && material.uniforms && material.uniforms.iTime) {
        material.uniforms.iTime.value = clock.getElapsedTime();
    }

    // use composer if available so postprocessing (bloom) is applied
    if (composer) {
        composer.render();
    } else {
        renderer.render(scene, camera);
    }
}
animate();

// ============================================================================
// WINDOW RESIZE HANDLER
// ============================================================================
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
});