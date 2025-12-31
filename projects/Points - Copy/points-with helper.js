import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';


// --- CONFIGURATION ---
const MODEL_PATH = './models/photo004.glb'; 
const BASE_COLOR = '#ffffff'; 
const POINT_SIZE = 0.00015;       
const DEFAULT_VIBRATE_AMPLITUDE = 0.0015;
const DEFAULT_SIZE_THRESHOLD = 14.0; // hide points with computed size smaller than this
const DEFAULT_VIBRATE_BOOST_SIZE_THRESHOLD = 25.0; // points smaller than this get x3 vibration

// --- SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color('#000000');

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 300);
camera.position.set(61.56, 2.97, 88); 

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
document.body.appendChild(renderer.domElement);

// --- POSTPROCESSING (composer + bloom) ---
let composer;
let bloomPass;
function initPostprocessing() {
    composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    // strength, radius, threshold
    bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.15, 0.4, 0.8);
    composer.addPass(renderPass);
    composer.addPass(bloomPass);
}
initPostprocessing();

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// --- NEW FEATURE: Log Camera Position ---
// Log the camera position whenever the controls trigger a change (e.g., rotate/zoom/pan)
controls.addEventListener('change', () => {
    const p = camera.position;
    console.log(`Camera position -> x: ${p.x.toFixed(2)}, y: ${p.y.toFixed(2)}, z: ${p.z.toFixed(2)}`);
});

// --- SHADERS ---

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
        vec3 randomPos = aRandom * 5.0;  // scale random values to position space
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

// --- GLOBAL MATERIAL REFERENCE ---
// We define this outside the loader so we can access it in the UI function
let material;

// --- LOAD GLB ---
const loader = new GLTFLoader();

loader.load(MODEL_PATH, (gltf) => {
    
    material = new THREE.ShaderMaterial({
        uniforms: {
            uSize: { value: POINT_SIZE },
            uColor: { value: new THREE.Color(BASE_COLOR) },
            // set pixel ratio default to 1.0 to match example UI
            uPixelRatio: { value: 1.0 },
            // 3. INITIALIZE UNIFORMS
            // match requested values: X:20.0, Y:-12.0, Z:-20.7
            uLightDir: { value: new THREE.Vector3(20.0, -12.0, -20.7) },
            iTime: { value: 0.0 },
            uVibrateAmp: { value: DEFAULT_VIBRATE_AMPLITUDE },
            uProgress: { value: 0.0 },
            uLightStrength: { value: 1.0 },
            uLightSizeBoost: { value: 3.0 }
            ,uSizeThreshold: { value: DEFAULT_SIZE_THRESHOLD }
            ,uVibrateBoostSizeThreshold: { value: DEFAULT_VIBRATE_BOOST_SIZE_THRESHOLD }
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
                }

                geometry.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1));
                geometry.setAttribute('aRandom', new THREE.Float32BufferAttribute(randoms, 3));
                geometry.setAttribute('aTargetPos', new THREE.Float32BufferAttribute(targetPositions, 3));
            }

            const points = new THREE.Points(geometry, material);

            points.scale.setScalar(50);
            geometry.center();

            scene.add(points);
        }
    });

    // 4. CREATE UI AFTER LOADING
    createUI();

}, undefined, (err) => {
    console.error('Error loading model:', err);
});

// --- UI GENERATION ---
function createUI() {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
    container.style.padding = '15px';
    container.style.borderRadius = '8px';
    container.style.color = 'white';
    container.style.fontFamily = 'sans-serif';
    container.style.width = '200px';

    const title = document.createElement('div');
    title.innerText = "Light Direction";
    title.style.marginBottom = "10px";
    title.style.fontWeight = "bold";
    container.appendChild(title);

        // Helper to create slider. Initializes from the material uniform if present
        function createSlider(label, axis) {
            const wrapper = document.createElement('div');
            wrapper.style.marginBottom = '5px';

            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.alignItems = 'center';
            row.style.justifyContent = 'space-between';

            // read initial value from material uniform if available
            let initialVal = 1.0;
            if (material && material.uniforms && material.uniforms.uLightDir) {
                initialVal = material.uniforms.uLightDir.value[axis];
            }

            const text = document.createElement('span');
            text.innerText = `${label}: ${initialVal.toFixed(1)}`;
            text.style.fontSize = '12px';

            const number = document.createElement('input');
            number.type = 'number';
            number.min = '-100.0';
            number.max = '100.0';
            number.step = '0.1';
            number.value = initialVal.toString();
            number.style.width = '70px';
            number.style.marginLeft = '8px';

            row.appendChild(text);
            row.appendChild(number);
            
                // Reset button restores the initial value
                const resetBtn = document.createElement('button');
                resetBtn.type = 'button';
                resetBtn.innerText = 'Reset';
                resetBtn.style.marginLeft = '6px';
                resetBtn.style.fontSize = '11px';
                resetBtn.style.padding = '2px 6px';
                resetBtn.addEventListener('click', () => setValue(initialVal));
                row.appendChild(resetBtn);

            const input = document.createElement('input');
            input.type = 'range';
            input.min = '-100.0';
            input.max = '100.0';
            input.step = '0.1';
            input.value = initialVal.toString();
            input.style.width = '100%';
            input.style.cursor = 'pointer';

            function setValue(val) {
                const v = parseFloat(val) || 0;
                text.innerText = `${label}: ${v.toFixed(1)}`;
                number.value = v;
                input.value = v;
                if (material && material.uniforms && material.uniforms.uLightDir) {
                    material.uniforms.uLightDir.value[axis] = v;
                }
            }

            input.addEventListener('input', (e) => {
                setValue(e.target.value);
            });

            number.addEventListener('input', (e) => {
                setValue(e.target.value);
            });

            wrapper.appendChild(row);
            wrapper.appendChild(input);
            container.appendChild(wrapper);
        }

    createSlider("X", "x");
    createSlider("Y", "y");
    createSlider("Z", "z");

    // Light strength control (uLightStrength)
    (function() {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        // initialize from material uniform when present
        let initial = 1.0;
        if (material && material.uniforms && material.uniforms.uLightStrength) initial = material.uniforms.uLightStrength.value;

        const text = document.createElement('span');
        text.innerText = `Light Strength: ${initial.toFixed(2)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.0';
        number.max = '10.0';
        number.step = '0.01';
        number.value = initial.toString();
        number.style.width = '70px';
        number.style.marginLeft = '8px';

        row.appendChild(text);
        row.appendChild(number);
            
            // Reset button for Light Strength
            const resetBtn = document.createElement('button');
            resetBtn.type = 'button';
            resetBtn.innerText = 'Reset';
            resetBtn.style.marginLeft = '6px';
            resetBtn.style.fontSize = '11px';
            resetBtn.style.padding = '2px 6px';
            resetBtn.addEventListener('click', () => setValue(initial));
            row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '10.0';
        input.step = '0.01';
        input.value = initial.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Light Strength: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            if (material && material.uniforms && material.uniforms.uLightStrength) material.uniforms.uLightStrength.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
    })();

    // Light size boost control (uLightSizeBoost) - scale points exposed to light
    (function() {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        // initialize from material uniform when present
        let initialBoost = 1.5;
        if (material && material.uniforms && material.uniforms.uLightSizeBoost) initialBoost = material.uniforms.uLightSizeBoost.value;

        const text = document.createElement('span');
        text.innerText = `Light Size Boost: ${initialBoost.toFixed(2)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.0';
        number.max = '10.0';
        number.step = '0.01';
        number.value = initialBoost.toString();
        number.style.width = '70px';
        number.style.marginLeft = '8px';

        row.appendChild(text);
        row.appendChild(number);
            
            // Reset button for Light Size Boost
            const resetBtn = document.createElement('button');
            resetBtn.type = 'button';
            resetBtn.innerText = 'Reset';
            resetBtn.style.marginLeft = '6px';
            resetBtn.style.fontSize = '11px';
            resetBtn.style.padding = '2px 6px';
            resetBtn.addEventListener('click', () => setValue(initialBoost));
            row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '10.0';
        input.step = '0.01';
        input.value = initialBoost.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Light Size Boost: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            if (material && material.uniforms && material.uniforms.uLightSizeBoost) material.uniforms.uLightSizeBoost.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
    })();

    // Point size control (uSize)
    (function() {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const text = document.createElement('span');
        text.innerText = `Point Size: ${POINT_SIZE.toFixed(3)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.0';
        number.max = '1.0';
        number.step = '0.001';
        number.value = POINT_SIZE.toString();
        number.style.width = '70px';
        number.style.marginLeft = '8px';

        row.appendChild(text);
        row.appendChild(number);
            
            // Reset button for Point Size
            const resetBtn = document.createElement('button');
            resetBtn.type = 'button';
            resetBtn.innerText = 'Reset';
            resetBtn.style.marginLeft = '6px';
            resetBtn.style.fontSize = '11px';
            resetBtn.style.padding = '2px 6px';
            resetBtn.addEventListener('click', () => setValue(POINT_SIZE));
            row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '0.2';
        input.step = '0.001';
        input.value = POINT_SIZE.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Point Size: ${val.toFixed(3)}`;
            number.value = val;
            input.value = val;
            if (material && material.uniforms && material.uniforms.uSize) material.uniforms.uSize.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
    })();

    // Size Threshold control (hide small points)
    (function() {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const initial = (material && material.uniforms && material.uniforms.uSizeThreshold) ? material.uniforms.uSizeThreshold.value : DEFAULT_SIZE_THRESHOLD;

        const text = document.createElement('span');
        text.innerText = `Size Threshold: ${initial.toFixed(2)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.0';
        number.max = '100.0';
        number.step = '0.1';
        number.value = initial.toString();
        number.style.width = '70px';
        number.style.marginLeft = '8px';

        row.appendChild(text);
        row.appendChild(number);

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.innerText = 'Reset';
        resetBtn.style.marginLeft = '6px';
        resetBtn.style.fontSize = '11px';
        resetBtn.style.padding = '2px 6px';
        resetBtn.addEventListener('click', () => setValue(initial));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '100.0';
        input.step = '0.1';
        input.value = initial.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Size Threshold: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            if (material && material.uniforms && material.uniforms.uSizeThreshold) material.uniforms.uSizeThreshold.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
    })();

    // Vibration boost threshold control (points smaller than this get x3 vibration)
    (function() {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const initial = (material && material.uniforms && material.uniforms.uVibrateBoostSizeThreshold) ? material.uniforms.uVibrateBoostSizeThreshold.value : DEFAULT_VIBRATE_BOOST_SIZE_THRESHOLD;

        const text = document.createElement('span');
        text.innerText = `Vibrate Boost Size: ${initial.toFixed(2)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.0';
        number.max = '100.0';
        number.step = '0.1';
        number.value = initial.toString();
        number.style.width = '70px';
        number.style.marginLeft = '8px';

        row.appendChild(text);
        row.appendChild(number);

        const resetBtn = document.createElement('button');
        resetBtn.type = 'button';
        resetBtn.innerText = 'Reset';
        resetBtn.style.marginLeft = '6px';
        resetBtn.style.fontSize = '11px';
        resetBtn.style.padding = '2px 6px';
        resetBtn.addEventListener('click', () => setValue(initial));
        row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '100.0';
        input.step = '0.1';
        input.value = initial.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Vibrate Boost Size: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            if (material && material.uniforms && material.uniforms.uVibrateBoostSizeThreshold) material.uniforms.uVibrateBoostSizeThreshold.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
    })();

    // Pixel ratio control (uPixelRatio)
    (function() {
        const defaultPR = (material && material.uniforms && material.uniforms.uPixelRatio) ? material.uniforms.uPixelRatio.value : 1.0;
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '8px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const text = document.createElement('span');
        text.innerText = `Pixel Ratio: ${defaultPR.toFixed(2)}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.5';
        number.max = '4.0';
        number.step = '0.01';
        number.value = defaultPR.toString();
        number.style.width = '70px';
        number.style.marginLeft = '8px';

        row.appendChild(text);
        row.appendChild(number);
            
            // Reset button for Pixel Ratio
            const resetBtn = document.createElement('button');
            resetBtn.type = 'button';
            resetBtn.innerText = 'Reset';
            resetBtn.style.marginLeft = '6px';
            resetBtn.style.fontSize = '11px';
            resetBtn.style.padding = '2px 6px';
            resetBtn.addEventListener('click', () => setValue(defaultPR));
            row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.5';
        input.max = '4.0';
        input.step = '0.01';
        input.value = defaultPR.toString();
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Pixel Ratio: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            if (material && material.uniforms && material.uniforms.uPixelRatio) material.uniforms.uPixelRatio.value = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
    })();

    // Vibration amplitude slider
    const vibWrapper = document.createElement('div');
    vibWrapper.style.marginTop = '10px';

    const vibText = document.createElement('span');
    // initialize from material uniform when available
    let initialVib = DEFAULT_VIBRATE_AMPLITUDE;
    if (material && material.uniforms && material.uniforms.uVibrateAmp) initialVib = material.uniforms.uVibrateAmp.value;
    vibText.innerText = `Vibration: ${initialVib.toFixed(2)}`;
    vibText.style.fontSize = '12px';

    const vibInput = document.createElement('input');
    vibInput.type = 'range';
    vibInput.min = '0.0';
    vibInput.max = '5.0';
    vibInput.step = '0.01';
    vibInput.value = initialVib.toString();
    vibInput.style.width = '100%';
    vibInput.style.cursor = 'pointer';

    const vibRow = document.createElement('div');
    vibRow.style.display = 'flex';
    vibRow.style.alignItems = 'center';
    vibRow.style.justifyContent = 'space-between';

    const vibNumber = document.createElement('input');
    vibNumber.type = 'number';
    vibNumber.min = '0.0';
    vibNumber.max = '5.0';
    vibNumber.step = '0.01';
    vibNumber.value = initialVib.toString();
    vibNumber.style.width = '70px';
    vibNumber.style.marginLeft = '8px';

    vibRow.appendChild(vibText);
    vibRow.appendChild(vibNumber);
    
        // Reset button for Vibration
        const vibReset = document.createElement('button');
        vibReset.type = 'button';
        vibReset.innerText = 'Reset';
        vibReset.style.marginLeft = '6px';
        vibReset.style.fontSize = '11px';
        vibReset.style.padding = '2px 6px';
        vibReset.addEventListener('click', () => setVib(initialVib));
        vibRow.appendChild(vibReset);

    function setVib(val) {
        const v = parseFloat(val) || 0;
        vibText.innerText = `Vibration: ${v.toFixed(2)}`;
        vibNumber.value = v;
        vibInput.value = v;
        if (material && material.uniforms && material.uniforms.uVibrateAmp) material.uniforms.uVibrateAmp.value = v;
    }

    vibInput.addEventListener('input', (e) => {
        setVib(e.target.value);
    });

    vibNumber.addEventListener('input', (e) => {
        setVib(e.target.value);
    });

    vibWrapper.appendChild(vibRow);
    vibWrapper.appendChild(vibInput);
    container.appendChild(vibWrapper);

    // Bloom strength control (post-processing)
    (function() {
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '10px';

        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.justifyContent = 'space-between';

        const text = document.createElement('span');
        text.innerText = `Bloom: ${bloomPass ? bloomPass.strength.toFixed(2) : '1.00'}`;
        text.style.fontSize = '12px';

        const number = document.createElement('input');
        number.type = 'number';
        number.min = '0.0';
        number.max = '10.0';
        number.step = '0.01';
        number.value = bloomPass ? bloomPass.strength.toString() : '1.0';
        number.style.width = '70px';
        number.style.marginLeft = '8px';

        row.appendChild(text);
        row.appendChild(number);
        
            // Reset button for Bloom
            const resetBtn = document.createElement('button');
            resetBtn.type = 'button';
            resetBtn.innerText = 'Reset';
            resetBtn.style.marginLeft = '6px';
            resetBtn.style.fontSize = '11px';
            resetBtn.style.padding = '2px 6px';
            const initialBloom = bloomPass ? bloomPass.strength : 1.0;
            resetBtn.addEventListener('click', () => setValue(initialBloom));
            row.appendChild(resetBtn);

        const input = document.createElement('input');
        input.type = 'range';
        input.min = '0.0';
        input.max = '10.0';
        input.step = '0.01';
        input.value = bloomPass ? bloomPass.strength.toString() : '1.0';
        input.style.width = '100%';
        input.style.cursor = 'pointer';

        function setValue(v) {
            const val = parseFloat(v) || 0;
            text.innerText = `Bloom: ${val.toFixed(2)}`;
            number.value = val;
            input.value = val;
            if (bloomPass) bloomPass.strength = val;
        }

        input.addEventListener('input', (e) => setValue(e.target.value));
        number.addEventListener('input', (e) => setValue(e.target.value));

        wrapper.appendChild(row);
        wrapper.appendChild(input);
        container.appendChild(wrapper);
    })();

    // Morphing toggle button
    const morphWrapper = document.createElement('div');
    morphWrapper.style.marginTop = '15px';
    morphWrapper.style.paddingTop = '10px';
    morphWrapper.style.borderTop = '1px solid rgba(255,255,255,0.3)';

    const morphBtn = document.createElement('button');
    morphBtn.type = 'button';
    morphBtn.innerText = 'Morph: Off';
    morphBtn.style.width = '100%';
    morphBtn.style.padding = '8px';
    morphBtn.style.backgroundColor = '#333';
    morphBtn.style.color = 'white';
    morphBtn.style.border = '1px solid #666';
    morphBtn.style.borderRadius = '4px';
    morphBtn.style.cursor = 'pointer';
    morphBtn.style.fontSize = '12px';

    let activeTween = null;

    morphBtn.addEventListener('click', () => {
        if (activeTween) {
            activeTween.stop();
        }

        const currentProgress = material.uniforms.uProgress.value;
        const targetProgress = currentProgress > 0.5 ? 0.0 : 1.0;
        const duration = 2500; // ms

        activeTween = new TWEEN.Tween({ progress: currentProgress })
            .to({ progress: targetProgress }, duration)
            .easing(TWEEN.Easing.Cubic.Out)
            .onUpdate((obj) => {
                material.uniforms.uProgress.value = obj.progress;
            })
            .onComplete(() => {
                morphBtn.innerText = (material.uniforms.uProgress.value > 0.5) ? 'Morph: On' : 'Morph: Off';
                activeTween = null;
            })
            .start();
    });

    morphWrapper.appendChild(morphBtn);
    container.appendChild(morphWrapper);

    document.body.appendChild(container);
}

// --- ANIMATION ---
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

// --- RESIZE ---
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
});