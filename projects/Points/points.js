import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass-transparentBg.js';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';
import { createUI as createUIFromModule } from './ui.js';


// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================
const MODEL_PATH = './models/photo004.glb';
const BASE_COLOR = '#ffffff';

// Point rendering
const POINT_SIZE = 0.5; // free form 0.005
const DEFAULT_VIBRATE_AMPLITUDE = 0.25;
const DEFAULT_SIZE_THRESHOLD = 12.0;
const DEFAULT_VIBRATE_BOOST_SIZE_THRESHOLD = 50.0;
const DEFAULT_PIXEL_RATIO = 2.0;

// Camera
const CAMERA_FOV = 45;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 300;
const CAMERA_POSITION = { x: 61.56, y: 2.97, z: 30 };

// Scene
const SCENE_BACKGROUND = '#000000';

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
// const gridZ = -50.0;
// const gridSpacing = 1;
// const GRID_SIZE = 8;
// const GAP_SIZE = 2;

const gridZ = -50.0;
const gridSpacing = 2;
const GRID_SIZE = 24;
const GAP_SIZE = 1.;

// UI controls
const UI_WIDTH = '200px';
const UI_TOP = '20px';
const UI_RIGHT = '20px';
const MORPH_DURATION = 2500;

// Mouse interaction (wrapped in objects for UI controls)
const mouseDamping = { value: 0.15 }; // Lower = smoother/slower mouse tracking, Higher = faster/more responsive (0.05-0.3)
const pointReturnSpeed = { value: 0.08 }; // Lower = slower spring-back, Higher = faster snap-back (0.02-0.2)

// ============================================================================
// SCENE SETUP
// ============================================================================
const scene = new THREE.Scene();

// // Create canvas gradient background (black to white with sharp transition in middle)
// const canvas = document.createElement('canvas');
// canvas.width = 1024;
// canvas.height = 1024;
// const ctx = canvas.getContext('2d');

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
renderer.setClearColor(0x000000, 0); // Transparent clear color
document.body.appendChild(renderer.domElement);

// ============================================================================
// POSTPROCESSING (BLOOM EFFECT)
// ============================================================================
let composer;
let bloomPass;

function initPostprocessing() {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);

    // IMPORTANT: RenderPass usually clears the buffer. 
    // If we want transparency, we must ensure the renderer's clear color is respected.
    // However, EffectComposer buffers might not preserve alpha by default in older versions or configs.
    // But usually, if the renderer has alpha:true, RenderPass should handle it.

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
    varying vec3 vPosition; // Pass position to fragment shader
    // per-vertex size
    attribute float aSize;
    uniform float uSize;
    uniform float uPixelRatio;
    // lighting used to scale sizes
    uniform vec3 uLightDir;
    uniform float uLightSizeBoost;
    // vibration using position for jitter
    uniform float iTime;
    uniform float uVibrateAmp;
    // morphing from position (random) to target positions
    attribute vec3 aTargetPos;
    uniform float uProgress;
    uniform float uVibrateBoostSizeThreshold;
    
    // Atlas support
    attribute float aTextureIndex;
    attribute float aIsGrid;
    varying float vTextureIndex;
    // Repulsion uniforms
    uniform vec2 uResolution;
    uniform vec2 uMouseNDC;
    uniform float uHoverRadius;
    uniform float uModelGapRadius;
    uniform vec2 uModelOffset; // New uniform for model offset
    
    varying float vComputedSize;
    varying vec4 vClipPos;
    
    void main() {
        vTextureIndex = aTextureIndex;
        vNormal = normal;
        vPosition = position; // Pass position

        // compute a small jitter per-vertex using the position as the random seed
        vec3 jitterBase = vec3(
            sin(iTime * 5.0 + position.x * 10.0),
            sin(iTime * 5.5 + position.y * 10.0),
            sin(iTime * 4.5 + position.z * 10.0)
        );
        
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
        // The boost scales from minBoost (large points) up to maxBoost (small points)
        // as computedSize goes from the threshold down to 0.
        float minBoost = 0.2; // Reduced jitter for large points
        float maxBoost = 8.0; // Increased jitter for small points
        
        float t = clamp((uVibrateBoostSizeThreshold - computedSize) / uVibrateBoostSizeThreshold, 0.0, 1.0);
        t = smoothstep(0.0, 1.0, t);
        float vibBoost = mix(minBoost, maxBoost, t);
        
        // Morph from position (random) to target position (aTargetPos) based on uProgress
        vec3 morphedPos = mix(position, aTargetPos, uProgress);
        
        // Add a curved path (arc)
        // Use position.x to randomize the arc height slightly for organic movement
        float arcHeight = 20.1 + sin(position.x * 10.0) * 20.0; 
        float arc = sin(uProgress * 3.14159) * arcHeight;
        morphedPos.z += arc;

        // Calculate distance to camera for damping (View Space)
        vec4 viewPosRaw = modelViewMatrix * vec4(morphedPos, 1.0);
        float distToCam = -viewPosRaw.z;
        
        // Damping: Closer to camera = less jitter
        // 0.0 at 5 units, 1.0 at 60 units
        float depthDamp = smoothstep(5.0, 60.0, distToCam);
        depthDamp = max(0.05, depthDamp); // Keep a tiny bit of life even when close

        // aIsGrid now stores the jitter factor for grid points (0.25 to 0.8)
        // Model points have aIsGrid = 0.0, so we default them to 1.0
        float jitterMult = mix(1.0, aIsGrid, step(0.001, aIsGrid));
        
        vec3 jitter = jitterBase * uVibrateAmp * vibBoost * depthDamp * 0.4 * jitterMult;

        vec3 displaced = morphedPos + jitter;

        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // --- Model Offset (Screen Space) ---
        // Only apply to model points (aIsGrid < 0.001)
        float isModel = 1.0 - step(0.001, aIsGrid);
        gl_Position.xy += uModelOffset * gl_Position.w * isModel;

        // --- Repulsion Effect (Screen Space) ---
        // We calculate the screen position of this vertex
        vec2 ndc = gl_Position.xy /gl_Position.w;
        vec2 screenPos = (ndc * 0.5 + 0.5) * uResolution;
        vec2 mouseScreen = (uMouseNDC * 0.5 + 0.5) * uResolution;
        
        vec2 dir = screenPos - mouseScreen;
        float dist = length(dir);
        
        // If inside the radius, push it away
        if (dist < uHoverRadius) {
            // Strength is 1.0 at center, 0.0 at edge
            float strength = smoothstep(uHoverRadius, 0.0, dist);
            strength = strength * strength; // Quadratic falloff for subtlety
            
            // Push direction
            vec2 pushDir = normalize(dir);
            if (length(dir) < 0.001) pushDir = vec2(1.0, 0.0); // avoid NaN
            
            // Max displacement amount (reduced for subtlety)
            float maxPush = 15.0; 
            vec2 offset = pushDir * strength * strength *  maxPush;
            
            screenPos += offset;
            
            // Convert back to Clip Space
            vec2 newNdc = (screenPos / uResolution - 0.5) * 2.0;
            gl_Position.xy = newNdc * gl_Position.w;
        }

        vClipPos = gl_Position;
        gl_PointSize = computedSize * uPixelRatio * (20.0 / -mvPosition.z);
    }
`;

const fragmentShader = `
    precision highp float;
    varying vec3 vNormal;
    varying float vComputedSize;
    varying vec3 vPosition;
    uniform vec3 uColor;
    uniform sampler2D uStarTexture;
    uniform float iTime;
    uniform float uBaseRotateSpeed; // Base speed controlled from JS
    uniform vec3 uMousePos;
    uniform float uHoverRadius;
    uniform vec2 uResolution;
    uniform vec2 uMouseNDC;
    varying vec4 vClipPos;
    
    // Atlas uniforms
    varying float vTextureIndex;
    uniform float uCols;
    uniform float uRows;
    // NEW UNIFORM DEFINITIONS
    uniform vec3 uLightDir; 
    uniform float uLightStrength;
    uniform float uSizeThreshold;
    
    void main() {
        // hide entire point if its computed size (from vertex) is below threshold
        if (vComputedSize < uSizeThreshold) discard;

        // --- Texture Rotation ---
        // Use vertex position to create a pseudo-random rotation speed
        float speed = 0.5 + fract(sin(dot(vPosition.xy, vec2(12.9898, 78.233))) * 43758.5453) * 1.5;
        
        // Convert Clip Space to Screen Space (pixels)
        vec2 ndc = vClipPos.xy / vClipPos.w;
        vec2 screenPos = (ndc * 0.5 + 0.5) * uResolution;
        vec2 mouseScreen = (uMouseNDC * 0.5 + 0.5) * uResolution;
        
        float dist = distance(screenPos, mouseScreen);
        float speedMultiplier = 1.0 + smoothstep(uHoverRadius, 0.0, dist) * 1.2;
        
        float angle = iTime * speed * uBaseRotateSpeed * speedMultiplier;
        
        // Create a 2D rotation matrix
        mat2 rotationMatrix = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        
        vec2 uv = gl_PointCoord;
        uv.y = 1.0 - uv.y; // Flip Y to match texture coordinates

        // Rotate texture coordinates around the center (0.5, 0.5)
        vec2 centeredCoords = uv - 0.5;
        vec2 rotatedCoords = rotationMatrix * centeredCoords + 0.5;
        
        // --- Atlas Mapping ---
        float colIndex = mod(vTextureIndex, uCols);
        float rowIndex = floor(vTextureIndex / uCols);
        
        // Calculate offset (assuming grid starts top-left, but UVs start bottom-left)
        // Row 0 (top) -> High V
        float uOffset = colIndex / uCols;
        float vOffset = (uRows - 1.0 - rowIndex) / uRows;
        
        vec2 atlasUV = rotatedCoords / vec2(uCols, uRows) + vec2(uOffset, vOffset);
        
        // Sample the star texture using atlas coordinates
        vec4 texColor = texture2D(uStarTexture, atlasUV);
        
        // Discard if texture alpha is too low (outside star shape)
        if (texColor.a < 0.5) discard;
        
        // We normalize the light direction to ensure consistent dot product
        vec3 lightDirection = normalize(uLightDir);
        
        // Dot Product calculation scaled by uLightStrength. Keep a small
        // ambient floor so points never go completely black.
        float lightIntensity = max(0.05, dot(vNormal, lightDirection) * uLightStrength);

        vec3 finalColor = uColor * lightIntensity;

        // Add color change on hover
        vec3 hoverColor = vec3(0., 0., 0.); // Cyan color
        float colorMix = smoothstep(uHoverRadius, 0.0, dist);
        finalColor = mix(finalColor, hoverColor * lightIntensity, colorMix);

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2(10000, 10000);
let material;
const loader = new GLTFLoader();
const speed = { value: 1. };
const hoverEffect = { radius: 200.0 };
// Create star texture from SVG file
function createStarTexture() {
    const textureLoader = new THREE.TextureLoader();
    const texture = textureLoader.load('./PNGs/sprite.png');
    // texture.colorSpace = THREE.SRGBColorSpace;
    // texture.flipY = false;
    return texture;
}

const starTexture = createStarTexture();

loader.load(MODEL_PATH, (gltf) => {

    material = new THREE.ShaderMaterial({
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
            uBaseRotateSpeed: { value: speed.value },
            uMousePos: { value: new THREE.Vector3(0, 0, 0) },
            uMouseNDC: { value: new THREE.Vector2(0, 0) },
            uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            uHoverRadius: { value: hoverEffect.radius },
            uCols: { value: 8.0 },
            uRows: { value: 4.0 },
            uModelGapRadius: { value: 0.35 }, // Radius of the gap in NDC space (0 to 1)
            uModelOffset: { value: new THREE.Vector2(0.2, 0) } // New uniform for model offset
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        depthWrite: false,
    });

    let points;

    gltf.scene.traverse((child) => {
        if (child.isMesh) {
            const originalGeometry = child.geometry;

            // Create attributes if positions exist
            if (originalGeometry && originalGeometry.attributes && originalGeometry.attributes.position) {
                const count = 100000;
                const scatterRange = 200
                const originalPosAttr = originalGeometry.attributes.position;
                const originalCount = originalPosAttr.count;

                // Create arrays for the new geometry and attributes
                const randomPositions = new Float32Array(count * 3);
                const targetPositions = new Float32Array(count * 3);
                const sizes = new Float32Array(count);
                const textureIndices = new Float32Array(count);
                const isGrid = new Float32Array(count);

                // Grid configuration for extra points
                const extraPoints = Math.max(0, count - originalCount);
                const gridSide = Math.ceil(Math.sqrt(extraPoints)) || 1; // Square grid
                // const gridSpacing = 1.0;
                // const gridZ = -50.0; // Behind the model

                // Calculate grid basis vectors to align perfectly with the camera view plane
                const camPos = new THREE.Vector3(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);
                const target = new THREE.Vector3(0, 0, 0); // Assuming looking at origin

                // Forward vector (from camera to target)
                const forward = new THREE.Vector3().subVectors(target, camPos).normalize();

                // Right vector (cross product of forward and world up)
                const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

                // Up vector (cross product of right and forward)
                const up = new THREE.Vector3().crossVectors(right, forward).normalize();

                // Center of the grid (placed at gridZ distance along the view direction, or just at a fixed position projected onto the view line)
                // The user wants it "behind the model". The model is at 0,0,0.
                // Let's place the grid center at `gridZ` distance *along the view vector* behind the origin.
                // Or simply `gridZ` units away from the origin in the direction of the camera (if gridZ is negative, it's behind).
                // Let's stick to the previous logic: gridZ is a Z-coordinate, but now we are rotating.
                // Let's interpret `gridZ` as "distance from origin along the view axis".

                const gridCenterPos = forward.clone().multiplyScalar(-gridZ); // -gridZ because forward is towards origin, we want behind. 
                // Actually gridZ is -50. So if we want it behind the model (which is at 0), relative to the camera...
                // Camera -> Model -> Grid.
                // Vector from Camera to Model is `forward`.
                // Grid should be further along `forward`.
                // So GridPos = ModelPos + forward * distance.
                // Let's use `gridZ` as the offset from the origin along the view direction.
                // If gridZ is -50, it means 50 units *behind* the origin.

                const gridOrigin = forward.clone().multiplyScalar(-gridZ); // Move 50 units BEHIND the origin (if gridZ is -50)
                const tempVec = new THREE.Vector3();

                // Generate random positions and store target positions
                for (let i = 0; i < count; i++) {
                    // Create random positions (normalized -1 to 1, then scaled by 50)
                    randomPositions[i * 3 + 0] = (Math.random() * 2.0 - 1.0) * scatterRange;
                    randomPositions[i * 3 + 1] = (Math.random() * 2.0 - 1.0) * scatterRange;
                    randomPositions[i * 3 + 2] = (Math.random() * 2.0 - 1.0) * scatterRange;

                    // If point is within original GLB vertex count, use GLB position as target
                    // Otherwise, keep it as random decorative point (target = random position)
                    if (i < originalCount) {
                        targetPositions[i * 3 + 0] = originalPosAttr.getX(i);
                        targetPositions[i * 3 + 1] = originalPosAttr.getY(i);
                        targetPositions[i * 3 + 2] = originalPosAttr.getZ(i);
                        isGrid[i] = 0.0;
                    } else {
                        // Grid formation for extra points
                        const extraIndex = i - originalCount;
                        const col = extraIndex % gridSide;
                        const row = Math.floor(extraIndex / gridSide);

                        // Calculate offset from center
                        const xOffset = (col - gridSide / 2) * gridSpacing;
                        const yOffset = (row - gridSide / 2) * gridSpacing;

                        // P = Center + Right * x + Up * y
                        tempVec.copy(gridOrigin)
                            .addScaledVector(right, xOffset)
                            .addScaledVector(up, yOffset);

                        targetPositions[i * 3 + 0] = tempVec.x;
                        targetPositions[i * 3 + 1] = tempVec.y;
                        targetPositions[i * 3 + 2] = tempVec.z;
                        isGrid[i] = 1.0;
                    }

                    // Create a much wider size distribution so points vary visibly
                    if (i < originalCount) {
                        const largeRandom = 0.5 + Math.pow(Math.random(), 0.7) * 15.5;
                        sizes[i] = largeRandom;
                    } else {
                        sizes[i] = GRID_SIZE; // Constant size for grid points
                    }

                    // Assign random texture index (0 to 15 for 4x4 grid)
                    textureIndices[i] = Math.floor(Math.random() * 32);
                }

                // --- SHADOW CARVING LOGIC ---
                // 1. Mark grid cells occupied by model projection
                const occupied = new Uint8Array(gridSide * gridSide);

                const projectionScaleEstimate = 3.0;
                const effectiveGap = GAP_SIZE * projectionScaleEstimate;
                const modelGapCells = Math.ceil(effectiveGap / gridSpacing);

                // Ensure the mesh's world matrix is up to date
                child.updateMatrixWorld(true);
                const worldMatrix = child.matrixWorld;

                // Ensure camera matrices are up to date for projection
                camera.updateMatrixWorld();
                camera.updateProjectionMatrix();

                const offset = material.uniforms.uModelOffset.value;
                const ndcVec = new THREE.Vector3();

                for (let i = 0; i < originalCount; i++) {
                    // Get model point in WORLD space
                    tempVec.set(
                        originalPosAttr.getX(i),
                        originalPosAttr.getY(i),
                        originalPosAttr.getZ(i)
                    );
                    tempVec.applyMatrix4(worldMatrix);

                    // Project onto Grid Plane
                    // Ray: CamPos -> ModelPoint
                    // Plane: (Point - GridOrigin) . Forward = 0
                    // t = (GridOrigin - CamPos) . Forward / (RayDir . Forward)
                    // But we constructed GridOrigin such that (GridOrigin - CamPos) is parallel to Forward!
                    // So t is just distance ratio.

                    // Simple projection:
                    // We want the point Q on the plane such that Cam, ModelPoint, Q are collinear.
                    // Vector V = ModelPoint - CamPos
                    // Vector F = Forward
                    // dist_model = V . F
                    // dist_grid = (GridOrigin - CamPos) . F  (This is simply -gridZ if gridZ is negative relative to origin, wait.)
                    // gridZ is -50. gridOrigin is 50 units away from origin. Cam is ~60 units from origin.
                    // Total distance Cam -> Grid = CamDist + 50.
                    // Total distance Cam -> Model = CamDist.
                    // Scale factor s = Dist_Grid / Dist_Model.

                    // 1. Project to NDC
                    ndcVec.copy(tempVec).project(camera);

                    // 2. Apply Screen Offset
                    ndcVec.x += offset.x;
                    ndcVec.y += offset.y;

                    // 3. Unproject to get point on new ray
                    ndcVec.unproject(camera);

                    // 4. Calculate Ray Direction (Camera -> New Point)
                    const rayDir = ndcVec.sub(camPos).normalize();

                    // 5. Intersect with Grid Plane
                    const numer = gridOrigin.clone().sub(camPos).dot(forward);
                    const denom = rayDir.dot(forward);

                    if (denom > 0.0001) {
                        const t = numer / denom;
                        const hitPoint = camPos.clone().add(rayDir.multiplyScalar(t));

                        // Convert HitPoint to Grid Coordinates (col, row)
                        const localHit = hitPoint.sub(gridOrigin);
                        const c = Math.round(localHit.dot(right) / gridSpacing + gridSide / 2);
                        const r = Math.round(localHit.dot(up) / gridSpacing + gridSide / 2);

                        // Mark neighborhood as occupied
                        for (let dx = -modelGapCells; dx <= modelGapCells; dx++) {
                            for (let dy = -modelGapCells; dy <= modelGapCells; dy++) {
                                const nc = c + dx;
                                const nr = r + dy;
                                if (nc >= 0 && nc < gridSide && nr >= 0 && nr < gridSide) {
                                    // Circular check
                                    if (dx * dx + dy * dy <= modelGapCells * modelGapCells) {
                                        occupied[nr * gridSide + nc] = 1;
                                    }
                                }
                            }
                        }
                    }
                }

                // 2. Hide occupied grid points
                for (let i = originalCount; i < count; i++) {
                    const extraIndex = i - originalCount;
                    const c = extraIndex % gridSide;
                    const r = Math.floor(extraIndex / gridSide);

                    if (occupied[r * gridSide + c] === 1) {
                        // Hide the point if it falls in the shadow
                        sizes[i] = 0.0;
                    } else {
                        // Point is visible, check if it's close to the halo
                        let nearHalo = false;
                        const checkRad = 2; // Check 2 cells radius
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
                            isGrid[i] = 0.6; // Medium-High jitter near halo
                        } else {
                            isGrid[i] = 0.25; // Low jitter for background
                        }
                    }
                }

                // Create a new BufferGeometry with random positions
                const geometry = new THREE.BufferGeometry();
                geometry.setAttribute('position', new THREE.Float32BufferAttribute(randomPositions, 3));
                geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
                geometry.setAttribute('aTargetPos', new THREE.Float32BufferAttribute(targetPositions, 3));
                geometry.setAttribute('aTextureIndex', new THREE.Float32BufferAttribute(textureIndices, 1));
                geometry.setAttribute('aIsGrid', new THREE.Float32BufferAttribute(isGrid, 1));
                geometry.setAttribute('normal', originalGeometry.attributes.normal || new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(0), 3));

                points = new THREE.Points(geometry, material);

                // points.scale.setScalar(50);
                geometry.center();

                scene.add(points);
            }
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
        UI_RIGHT,
        speed: speed,
        hoverEffect: hoverEffect,
        mouseDamping: mouseDamping,
        pointReturnSpeed: pointReturnSpeed,
        onStart: () => {
            // const lightDir = material.uniforms.uLightDir.value;
            // const targetZ = lightDir.z * -2;

            // // 1. From original to -100 in 400ms (delayed by 1s)
            // new TWEEN.Tween(lightDir)
            //     .to({ z: targetZ }, 100)
            //     .easing(TWEEN.Easing.Back.InOut)
            //     .delay(100)
            //     .start();
        },
        onComplete: () => {
            // const lightDir = material.uniforms.uLightDir.value;
            // const targetZ = lightDir.z * -2;

            // // 1. From original to -100 in 400ms (delayed by 1s)
            // new TWEEN.Tween(lightDir)
            //     .to({ z: targetZ }, 400)
            //     .easing(TWEEN.Easing.Back.InOut)
            //     .delay(100)
            //     .start();
        }
    });

}, undefined, (err) => {
    console.error('Error loading model:', err);
});

const intersectionPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshBasicMaterial({ visible: false })
);
scene.add(intersectionPlane);

// Smooth mouse position with damping
const targetMouse = new THREE.Vector2(10000, 10000);
const smoothMouse = new THREE.Vector2(10000, 10000);
const smoothRepulsionMouse = new THREE.Vector2(10000, 10000); // Slower interpolation for repulsion effect

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    targetMouse.copy(mouse);
}

function onMouseLeave() {
    // Move target mouse far away when mouse leaves
    targetMouse.set(10000, 10000);
}

window.addEventListener('mousemove', onMouseMove, false);
window.addEventListener('mouseleave', onMouseLeave, false);

// ============================================================================
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);
    TWEEN.update();
    controls.update();

    // Smooth damping of mouse position for raycasting
    smoothMouse.x += (targetMouse.x - smoothMouse.x) * mouseDamping.value;
    smoothMouse.y += (targetMouse.y - smoothMouse.y) * mouseDamping.value;

    // Separate slower smoothing for repulsion effect (controls point return speed)
    smoothRepulsionMouse.x += (targetMouse.x - smoothRepulsionMouse.x) * pointReturnSpeed.value;
    smoothRepulsionMouse.y += (targetMouse.y - smoothRepulsionMouse.y) * pointReturnSpeed.value;

    raycaster.setFromCamera(smoothMouse, camera);
    const intersects = raycaster.intersectObject(intersectionPlane);

    if (intersects.length > 0) {
        if (material) {
            material.uniforms.uMousePos.value.copy(intersects[0].point);
        }
    }

    // update time uniform for vibration
    if (material && material.uniforms && material.uniforms.iTime) {
        material.uniforms.iTime.value = clock.getElapsedTime();
        material.uniforms.uBaseRotateSpeed.value = speed.value;
        material.uniforms.uHoverRadius.value = hoverEffect.radius;
        // Use slower-smoothed position for repulsion to control point return speed
        if (material.uniforms.uMouseNDC) material.uniforms.uMouseNDC.value.copy(smoothRepulsionMouse);
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
    if (material && material.uniforms && material.uniforms.uResolution) {
        material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    }
});
