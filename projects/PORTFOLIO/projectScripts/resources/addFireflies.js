import * as THREE from 'three';
import * as CSU from '../utils/addConstantUniform.js';
import { resources } from './loadResources.js';
// Define the radius as a constant in one place

//CENTER AROUND LATHE_CENTER WORLD POS
const FIREFLY_RADIUS = 15.0;

const startPosition = new THREE.Vector3(
    -FIREFLY_RADIUS,
    7.25,
    0
);

const vertexShader = `
    uniform float iTime;
    uniform vec2 uMouse;
    uniform float uMergeProgress;
    uniform vec3 uPointMergePos;

    attribute float size;
    attribute float speed;
    attribute vec3 direction;
    attribute float random;

    const float radius =  ${FIREFLY_RADIUS.toFixed(1)};
    const float speedFactor = .006;
    const float PI = 3.1415926535;
    varying float vRandom; 

    void main() {
        vRandom = random; //for fragmentShader
        // 1. LIFECYCLE
        float lifeTime = (radius * 2.0) / (direction.x * speed * speedFactor);
        float cycleTime = mod(iTime + random * lifeTime, lifeTime);

        // 2. POSITION
        vec3 displacement = direction * speed * speedFactor * cycleTime;
  
        vec3 newPosition = position + displacement;
        newPosition.x *= 15.;

        // 4. BEHAVIOR SELECTION
        // "KAMIKAZE" (Fly toward camera) vs "ORBITAL" (Rotate gently)
        if (random > 0.8) {
             // --- TYPE: KAMIKAZE --- 
             // Reset orbit/rotation logic for these so they fly straight
             // Move along Z axis towards camera (positive Z in Three.js)
             // Use mod to loop them coming back from far distance
             float cameraSpeed = speed * 10.0; // Faster
             float zDist = 20.0;
             newPosition.z = mod(iTime * cameraSpeed + (random * 100.0), zDist) + 15.0; 
             
             // Interactive Wiggle: React to uMouse
             // uMouse.x moves Z (Left/Right), uMouse.y moves Y (Up/Down)
             // We map standard mouse (-1 to 1) to a factor
             
             newPosition.x = position.x + sin(iTime + random * 10.0) * 2.0; 
             
             // Y reacts to Mouse Y with Randomized Damping
             // We use 'random' (0.0 to 1.0) to vary the strength.
             // Some particles will follow the mouse loosely (dampened), others more tightly.
             // Y reacts to Mouse Y with Randomized Damping & Simulated Wave Delay
             // 1. DAMPNESS: random^3 biases heavily towards 0, so we multiply by 40.0 to make the few "active" ones really move.
             float dampness = (random * random ); 
             
             // 2. DELAY: We simulate a signal traveling down the depth (X-axis)
             // As the wave passes (sin), the particle reacts more or less to the mouse.
             // This prevents them from all moving in perfect unison.
             float waveDelay = random + 0.4 * sin(iTime * 3.0 - position.x * 0.2); 

             newPosition.y = position.y + (cos(iTime + random * 10.0) * 2.0) + (uMouse.y * dampness * waveDelay); 
             
             // Removed Z reaction to Mouse X as requested
        } else {
             // --- TYPE: ORBITAL ---
            // Apply the rotation to the x and y coordinates only for the points that need it
            vec2 pivot = vec2(${startPosition.y.toFixed(1)}, ${startPosition.z.toFixed(1)});
            float angle = iTime * 0.09; 
            mat2 rotationMatrix = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
            newPosition.yz = rotationMatrix * (newPosition.yz - pivot) + pivot;
        }
        

        // 4. SIZE
        // Synchronize breathing rhythm with texture change speed (3.0 * random)
        float syncSpeed = 3.0 * random;
        float pulsatingSize = size + 15.0 * sin(iTime * syncSpeed + random * 100.0);
    
        // if ( newPosition.z > 0. || newPosition.y < 0.) {
        //     pulsatingSize = 0.0;
        // }
        // 5. PROJECTION
        // Apply Merge Blending:
        // Apply Staggered Convergence:
        // uMergeProgress goes 0 -> 1 linearly.
        // Stagger: localProgress = smoothstep(random * 0.4, 1.0, uMergeProgress)
        
        float progressCycle = uMergeProgress; // No Modulo, just 0 -> 1 clamp effective via smoothstep
        
        // Wait offset based on random, so they don't all start moving at t=0
        float staggerStart = random * 0.4; // up to 40% delay start
        float localProgress = smoothstep(staggerStart, 1.0, progressCycle);
        
        vec3 finalPos = mix(newPosition, uPointMergePos, localProgress);
        
        vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
        
        // Conditional Size Multiplier:
        // Kamikaze (random > 0.8) -> 2.0
        // Orbital (random <= 0.8) -> 4.0 (Doubled as requested)
        float isOrbital = step(random, 0.8); 
        float sizeMult = 1.6 + (1.2 * isOrbital);
        
        // Shrink points as they converge
        // Reduce to randomized small size (0.05 to 0.25) when progress is 1.0
        float randomTarget = 0.05 + (random * 0.2);
        // Reduce to randomized small size (0.05 to 0.25) when progress is 1.0
        // float randomTarget = 0.05 + (random * 0.2); // Already defined above
        float shrinkFactor = mix(1.0, randomTarget, localProgress);
        
        float calculatedSize = sizeMult * pulsatingSize * (5.0 / -mvPosition.z) * shrinkFactor;
        
        // Custom Logic: Discard Orbital points if X > 1.0
        // isOrbital is 1.0 if orbital, 0.0 if not.
        if (isOrbital > 0.5 && finalPos.x > 1.0) {
             calculatedSize = 0.0;
        }

        gl_PointSize = clamp(calculatedSize, 0.5, 30.0); // Allow going smaller than 5.0
        gl_Position = projectionMatrix * mvPosition;
    }
`;

const fragmentShader = `
    uniform sampler2D fireFliesTexture;
    uniform float iTime;
    varying float vRandom; // <-- Receive the random value

    void main() {
        // Define the two possible colors
        vec3 orange = vec3(2.0, 0.8, 0.2);
        vec3 cyan = vec3(0.7, 1.8, 1.8); // A lightning cyan color

        // We hash vRandom to get a new random value for color, 
        // because vRandom is correlated with Behavior (Kamikaze > 0.8).
        float colorRandom = fract(sin(vRandom * 123.45) * 43758.5453);
        
        vec3 color;

        // If the random value is less than 0.5 (a 50% chance), use cyan.
        if (colorRandom < 0.5) {
            color = cyan;
        } else {
            color = orange;
        }

        // Sprite Sheet Logic
        float cols = 8.0;
        float rows = 4.0;
        
        // Intermittent Animation Logic
        // 1. Define Cycle
        float activeDuration = 1.5; // Animates for 1.5s
        float pauseDuration = 2.5;  // Pauses for 2.5s
        float totalCycle = activeDuration + pauseDuration;
        
        // 2. Local Time (Desynchronized)
        float localTime = iTime + (vRandom * 10.0);
        float timeInCycle = mod(localTime, totalCycle);
        
        // 3. Calc Stepped Time (Burst vs Pause)
        float animationSpeed = 20.0; // 10 FPS during burst
        float steppedTime = 0.0;
        
        if (timeInCycle < activeDuration) {
             // Active Phase: Animate
             steppedTime = floor(timeInCycle * animationSpeed);
        } else {
             // Pause Phase: Pick a NEW random frame for this specific pause cycle
             // We use 'floor(localTime / totalCycle)' to get the unique ID of the current cycle.
             float cycleIndex = floor(localTime / totalCycle);
             float randomSeed = sin(cycleIndex * 123.45 + vRandom * 67.89); 
             // Map -1..1 to 0..32
             float randomFrame = abs(randomSeed) * 32.0;
             steppedTime = floor(randomFrame);
        }

        float frameIndex = floor(mod((vRandom * 32.0) + steppedTime, 32.0));

        float col = mod(frameIndex, cols);
        float row = floor(frameIndex / cols);
        
        // Fix: Invert the row because texture coordinates (0,0) are bottom-left,
        // but often sprite sheets are read top-left to bottom-right.
        // OR simply because WebGL Y is flipped relative to image rows.
        row = rows - 1.0 - row;

        // Flip V coordinate inside the cell
        vec2 cellUV = gl_PointCoord;
        cellUV.y = 1.0 - cellUV.y; 

        vec2 uv = (cellUV + vec2(col, row)) / vec2(cols, rows);

        // Apply texture and intensity
        vec4 tex = texture2D(fireFliesTexture, uv);
        float intensity = pow(tex.a, 3.0); 

        // Set the final color
        gl_FragColor = vec4(color * intensity, 1.0);
    }
`;

export function addFireflies(scene, amount = 600) {

    const positions = new Float32Array(amount * 3);
    const sizes = new Float32Array(amount);
    const speeds = new Float32Array(amount);
    const directions = new Float32Array(amount * 3);
    const randoms = new Float32Array(amount);

    const vertex = new THREE.Vector3();
    const direction = new THREE.Vector3();

    for (let i = 0; i < amount; i++) {
        // Define the central starting point

        // Create a small, random offset from the center
        const offset = new THREE.Vector3().randomDirection().multiplyScalar(Math.random() * 5.0);
        // Apply the offset to get the final starting position
        vertex.copy(startPosition).add(offset);
        vertex.toArray(positions, i * 3);

        // Set a random direction for movement
        direction.x = Math.random() * 0.5 + 0.5;
        direction.y = (Math.random() - 0.5) * 1.0;
        direction.z = (Math.random() - 0.5) * 0.5;
        direction.normalize();
        direction.toArray(directions, i * 3);

        // Set unique attributes for each particle
        randoms[i] = Math.random();
        sizes[i] = 20.0;
        speeds[i] = Math.random() * 0.4 + 0.2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
    geometry.setAttribute('direction', new THREE.BufferAttribute(directions, 3));
    geometry.setAttribute('random', new THREE.BufferAttribute(randoms, 1));

    // Note: The 'vertexShader' and 'fragmentShader' constants must be defined
    // outside this function, as in your original code.
    const fireFliesTexture = resources.spriteSheet;
    const material = new THREE.ShaderMaterial({
        uniforms: {
            iTime: {
                value: 0
            },
            uMouse: {
                value: new THREE.Vector2(0, 0)
            },
            fireFliesTexture: {
                value: fireFliesTexture
            },
            uMergeProgress: {
                value: 0.0
            },
            uPointMergePos: {
                value: new THREE.Vector3(-0.6, 4.4, 0)
            }
        },
        vertexShader: vertexShader, // Assumes vertexShader is in scope
        fragmentShader: fragmentShader, // Assumes fragmentShader is in scope
        blending: THREE.AdditiveBlending,
        depthTest: true,
        depthWrite: false,
        transparent: true
    });
    CSU.linkConstantUniforms(material, ['iTime', 'uMouse', 'uMergeProgress'])
    const fireflies = new THREE.Points(geometry, material);
    scene.add(fireflies);
    fireflies.name = "fireflies";
    // fireflies.position.x = -10


    const detector = new THREE.Object3D();
    detector.name = "firefliesDetector";
    // detector.add(fireflies);
    scene.add(detector);
    return fireflies;
}