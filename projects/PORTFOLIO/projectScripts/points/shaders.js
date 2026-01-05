export const vertexShader = `
    precision highp float;
    varying vec3 vNormal;
    varying vec3 vPosition; // Pass position to fragment shader
    // per-vertex size
    // attribute float aStartSize; // Removed
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
    // attribute vec3 aStartPos; // REMOVED: Using 'position' instead
    uniform float uProgress;
    uniform float uVibrateBoostSizeThreshold;
    
    // Atlas support
    // attribute float aStartIsGrid; // Removed
    // attribute float aTargetIsGrid; // Removed
    attribute float aStableRandom;

    // PACKED ATTRIBUTES
    attribute vec2 aStartSizeIsGrid;
    attribute vec2 aTargetSizeIsGrid;
    
    varying float vTextureIndex;
    varying float vStableRandom; // Pass stable index to fragment
    // Repulsion uniforms
    uniform vec2 uResolution;
    uniform vec2 uMouseNDC;
    uniform float uHoverRadius;
    uniform vec2 uModelScreenOffset; // New uniform for model offset
    uniform vec3 uModelPosition; // New uniform for World Position (XYZ)
    uniform vec3 uModelRotation; // New uniform for rotation (XYZ)
    uniform float uModelScale; // New uniform for scale
    uniform float uIsChaos; // Chaos state flag (1.0 = Chaos/Root, 0.0 = Other)
    uniform float uGridZ;
    uniform float uBaseGridZ;
    uniform vec3 uGridForward;
    uniform float uModelVibFactor;
    uniform float uModelPointSizeFactor;
    uniform float uHoverPointScaleFactor;

    // COLOR SUPPORT
    // Color
    attribute vec3 aStartColor;
    attribute vec3 aTargetColor;
    varying vec3 vColor;
    
    // NORMALS
    attribute vec3 aStartNormal;
    attribute vec3 aTargetNormal;

    // CUSTOM SKINNING
    attribute vec4 aStartSkinWeight;
    attribute vec4 aTargetSkinWeight;
    // attribute vec4 skinIndex; // Handled by skinning_pars_vertex? No, we must declare if not included? 
    // skinning_pars_vertex usually declares it. But usually it expects uniform sampler for boneTexture.
    // We need to ensure skinIndex is available.
    // Wait, skinIndex is integer/uvec? No, in WebGL1/Basic three it's typically vec4.
    // We'll rely on #include <skinning_pars_vertex> to declare uniforms and helpers, 
    // but WE declared 'skinIndex' attribute in JS. We might need to declare it here if the chunk doesn't.
    // Standard chunks:
    // skinning_pars_vertex: declares 'uniform mat4 bindMatrix; uniform mat4 bindMatrixInverse; uniform highp sampler2D boneTexture; ...'
    // It DOES NOT declare attributes (usually done in standard VS).
    // attribute vec4 skinIndex; // Declaring explicitly (Managed by Three.js when skinning: true)
    // Note: skinWeight is unused/replaced by our custom ones.

    #include <common>
    #include <skinning_pars_vertex>

    varying float vComputedSize;
    varying float vIsGrid; 
    varying vec4 vClipPos; 
    
    mat3 rotateY(float theta) { return mat3(cos(theta),0,sin(theta), 0,1,0, -sin(theta),0,cos(theta)); }
    mat3 rotateX(float theta) { return mat3(1,0,0, 0,cos(theta),sin(theta), 0,-sin(theta),cos(theta)); }
    mat3 rotateZ(float theta) { return mat3(cos(theta),sin(theta),0, -sin(theta),cos(theta),0, 0,0,1); }
    float random(vec2 st) { return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123); }

    void main() {
        // UNPACK ATTRIBUTES
        float aStartSize = aStartSizeIsGrid.x;
        float aStartIsGrid = aStartSizeIsGrid.y;
        float aTargetSize = aTargetSizeIsGrid.x;
        float aTargetIsGrid = aTargetSizeIsGrid.y;

        // Compute Full Rotation Matrix
        mat3 modelRot = rotateZ(uModelRotation.z) * rotateY(uModelRotation.y) * rotateX(uModelRotation.x);
        vColor = mix(aStartColor, aTargetColor, uProgress); 
        vStableRandom = aStableRandom;
        
        vTextureIndex = floor(aStableRandom * 32.0);
        float clampedProgress = clamp(uProgress, 0.0, 1.0);

        vIsGrid = mix(aStartIsGrid, aTargetIsGrid, clampedProgress);
        vPosition = position; 
        
        float isStartModel = 1.0 - smoothstep(0.0, 0.1, aStartIsGrid);
        float isTargetModel = 1.0 - smoothstep(0.0, 0.1, aTargetIsGrid);

        vec3 alignedStartNormal = aStartNormal;
        if (isStartModel > 0.5) alignedStartNormal = modelRot * alignedStartNormal;
        vec3 alignedTargetNormal = aTargetNormal;
        if (isTargetModel > 0.5) alignedTargetNormal = modelRot * alignedTargetNormal;
        vec3 objectNormal = mix(alignedStartNormal, alignedTargetNormal, clampedProgress);
        if (length(objectNormal) > 0.001) objectNormal = normalize(objectNormal);
        vNormal = objectNormal;

        // Jitter
        vec3 jitterBase = vec3(sin(iTime * 5.0 + aStableRandom * 100.0), sin(iTime * 5.5 + aStableRandom * 123.0), sin(iTime * 4.5 + aStableRandom * 456.0));
        vec3 normalView = normalize(normalMatrix * objectNormal);
        vec3 lightDirView = normalize((viewMatrix * vec4(uLightDir, 0.0)).xyz);
        float lightFactor = max(0.0, dot(normalView, lightDirView));
        float sizeFromLight = 1.0 + lightFactor * uLightSizeBoost;
        float currentSizeAttribute = mix(aStartSize, aTargetSize, clampedProgress);
        float computedSize = currentSizeAttribute * sizeFromLight + uSize * 20.0;

        // Apply Model Point Size Factor
        float isModelForSize = 1.0 - smoothstep(0.0, 0.1, vIsGrid);
        computedSize *= mix(1.0, uModelPointSizeFactor, isModelForSize);
        
        // Appearance
        float appearDuration = 1.0;
        float maxDelay = 2.0;                 
        float myDelay = aStableRandom * maxDelay;
        float appearScale = smoothstep(myDelay, myDelay + appearDuration, iTime);
        computedSize *= appearScale;
        vComputedSize = computedSize;

        // --- Vib Boost Logic (Restored) ---
        // Smoothly amplify vibration for smaller points.
        float minBoost = 0.2; 
        float maxBoost = 8.0; 
        float tBoost = clamp((uVibrateBoostSizeThreshold - computedSize) / uVibrateBoostSizeThreshold, 0.0, 1.0);
        tBoost = smoothstep(0.0, 1.0, tBoost);
        float vibBoost = mix(minBoost, maxBoost, tBoost);

        // --- SKINNING LOGIC ---
        // Interpolate Weights
        vec4 curSkinWeight = mix(aStartSkinWeight, aTargetSkinWeight, clampedProgress);
        float weightSum = dot(curSkinWeight, vec4(1.0));
        float skinInfluence = clamp(weightSum, 0.0, 1.0);

        // Prepare Start Position
        vec3 alignedStartPos = position;
        
        if (isStartModel < 0.5) {
             vec3 shift = uGridForward * (uBaseGridZ - uGridZ);
             alignedStartPos += shift;
        }

        if (isStartModel > 0.5) {
             #ifdef USE_SKINNING
                if (skinInfluence > 0.01) {
                    mat4 boneMatX = getBoneMatrix( skinIndex.x );
                    mat4 boneMatY = getBoneMatrix( skinIndex.y );
                    mat4 boneMatZ = getBoneMatrix( skinIndex.z );
                    mat4 boneMatW = getBoneMatrix( skinIndex.w );
                
                    vec4 skinVertex = bindMatrix * vec4( alignedStartPos, 1.0 );
                    vec4 skinned = vec4( 0.0 );
                    skinned += boneMatX * skinVertex * curSkinWeight.x;
                    skinned += boneMatY * skinVertex * curSkinWeight.y;
                    skinned += boneMatZ * skinVertex * curSkinWeight.z;
                    skinned += boneMatW * skinVertex * curSkinWeight.w;
                    vec3 transformedStart = ( bindMatrixInverse * skinned ).xyz;
                    
                    alignedStartPos = mix(alignedStartPos, transformedStart, skinInfluence);
                }
            #endif
            
            // Apply Model Transform AFTER Skinning (Local -> World/Object)
            alignedStartPos *= uModelScale;
            alignedStartPos = modelRot * alignedStartPos;
            alignedStartPos += uModelPosition;
        }

        // Prepare Target Position
        vec3 alignedTargetPos = aTargetPos;
        
        // Offset Grid Points dynamically
        if (isTargetModel < 0.5) {
             vec3 shift = uGridForward * (uBaseGridZ - uGridZ);
             alignedTargetPos += shift;
        }

        if (isTargetModel > 0.5) {
            #ifdef USE_SKINNING
                if (skinInfluence > 0.01) {
                    mat4 boneMatX = getBoneMatrix( skinIndex.x );
                    mat4 boneMatY = getBoneMatrix( skinIndex.y );
                    mat4 boneMatZ = getBoneMatrix( skinIndex.z );
                    mat4 boneMatW = getBoneMatrix( skinIndex.w );
                
                    vec4 skinVertex = bindMatrix * vec4( alignedTargetPos, 1.0 );
                    vec4 skinned = vec4( 0.0 );
                    skinned += boneMatX * skinVertex * curSkinWeight.x;
                    skinned += boneMatY * skinVertex * curSkinWeight.y;
                    skinned += boneMatZ * skinVertex * curSkinWeight.z;
                    skinned += boneMatW * skinVertex * curSkinWeight.w;
                    vec3 transformedTarget = ( bindMatrixInverse * skinned ).xyz;

                    alignedTargetPos = mix(alignedTargetPos, transformedTarget, skinInfluence);
                }
            #endif
            
            // Apply Model Transform AFTER Skinning (Local -> World/Object)
            alignedTargetPos *= uModelScale;
            alignedTargetPos = modelRot * alignedTargetPos;
            alignedTargetPos += uModelPosition;
        }

        vec3 morphedPos = mix(alignedStartPos, alignedTargetPos, clampedProgress);
        
        // Calculate distance to camera for damping (View Space)
        vec4 viewPosRaw = modelViewMatrix * vec4(morphedPos, 1.0);
        float distToCam = -viewPosRaw.z;
        
        // --- HOVER VIBRATION BOOST ---
        // Project stable position to screen space to check hover
        vec4 clipPosStable = projectionMatrix * viewPosRaw;
        
        // Apply Model Offset to the stable check position too!
        clipPosStable.xy += uModelScreenOffset * clipPosStable.w;
        
        vec2 ndcStable = clipPosStable.xy / clipPosStable.w;
        vec2 screenPosStable = (ndcStable * 0.5 + 0.5) * uResolution;
        vec2 mouseScreen = (uMouseNDC * 0.5 + 0.5) * uResolution;
        float distStable = distance(screenPosStable, mouseScreen);

        float hoverVibMult = 1.0;
        if (distStable < uHoverRadius) {
            // Smoothly double the factor at the center
            hoverVibMult = 2.0 + smoothstep(uHoverRadius, 0.0, distStable);
        }
        // -----------------------------

        // Distance Logic:
        float distScaler = smoothstep(10.0, 200.0, distToCam) * 4.5 + 2.75;

        // vIsGrid now stores the jitter factor for grid points
        float jitterMult = max(1.0, vIsGrid);
        
        // Apply Model Vibration Factor
        float isCurrentModel = 1.0 - smoothstep(0.0, 0.1, vIsGrid);
        
        // Apply hover boost effectively to the model component
        float effectiveModelVib = uModelVibFactor * hoverVibMult;
        float vibFactor = mix(1.0, effectiveModelVib, isCurrentModel);

        vec3 jitter = jitterBase * uVibrateAmp * vibFactor * vibBoost * distScaler * 0.4 * jitterMult;


        vec3 displaced = morphedPos + jitter;

        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        
        // --- Model Offset (Screen Space) ---
        // --- Model Offset (Screen Space) ---
        // Apply offset to ALL points (Model + Grid) so the "Shadow" follows the Model
        gl_Position.xy += uModelScreenOffset * gl_Position.w;

        // --- Repulsion Effect (Screen Space) ---
        // We calculate the screen position of this vertex
        vec2 ndc = gl_Position.xy /gl_Position.w;
        vec2 screenPos = (ndc * 0.5 + 0.5) * uResolution;
        // vec2 mouseScreen = (uMouseNDC * 0.5 + 0.5) * uResolution; // Already defined above
        
        vec2 dir = screenPos - mouseScreen;
        float dist = length(dir);
        
        // If inside the radius, push it away
        // But if the mouse is DIRECTLY over the vertex (very small dist), don't push it.
        // This allows the user to "hover" a specific point without it fleeing.
        float minInteractionDist = 5.0; 
        
        // --- Size Boosting (Smooth) ---
        // Instead of a hard snap, we define a transition zone.
        // 0px - 5px: Max Boost (2.0x)
        // 5px - 20px: Linear Falloff to 1.0x
        float boostStart = 5.0;
        float boostEnd = 20.0;
        
        float boostFactor = 1.0;
        if (dist < boostEnd) {
             // 1.0 at boostEnd, 0.0 at 0.0 (Wait, we want max boost at 0).
             // Let's use smoothstep.
             // smoothstep(boostEnd, boostStart, dist) -> 
             // if dist == boostEnd -> 0.0
             // if dist == boostStart -> 1.0
             float t = smoothstep(boostEnd, boostStart, dist);
             boostFactor = 1.0 + t; // Grows from 1.0 to 2.0
        }
        computedSize *= boostFactor;

        // Apply specialized scale for the grid point under hover (Smooth)
        if (vIsGrid > 0.5) {
             // Smooth transition: Full scale at 0 distance, normal scale at 15px distance
             float hoverScaleT = smoothstep(15.0, 0.0, distStable);
             float targetScale = mix(1.0, uHoverPointScaleFactor, hoverScaleT);
             computedSize *= targetScale;
        }
        
        // --- Repulsion ---
        // Only repulse if we are outside the "lock" zone (minInteractionDist)
        // This ensures points we are trying to catch don't run away.
        // --- Repulsion ---
        // Smooth Repulsion with Inner Fade
        // We want 0 repulsion at center (so we can click/catch), 
        // Max repulsion in the ring, 0 repulsion at outer edge.
        
        if (dist < uHoverRadius) {
            // Outer Falloff (0 at radius, 1 at center)
            float outerFactor = smoothstep(uHoverRadius, 0.0, dist);
            
            // Inner Falloff (0 at minInteractionDist, 1 at min + 20)
            // This prevents the "Snap" when crossing the minInteraction boundary
            float innerFactor = smoothstep(minInteractionDist, minInteractionDist + 20.0, dist);
            
            float strength = outerFactor * innerFactor; 
            strength = strength * strength; // Quadratic
            
            // Push direction
            vec2 pushDir = normalize(dir);
            if (length(dir) < 0.001) pushDir = vec2(1.0, 0.0);
            
            float maxPush = 25.0; 
            vec2 offset = pushDir * strength * maxPush;
            
            screenPos += offset;
            
            screenPos += offset;
            
            // Converting screenPos back to clip space for output
            vec2 newNdc = (screenPos / uResolution - 0.5) * 2.0;
            gl_Position.xy = newNdc * gl_Position.w;
        }

        // --- Dynamic Texture Animation (Hover Effect) ---
        // Reuse pre-calculated variables:
        // dist: distance from mouse in pixels
        // minInteractionDist: inner forbidden zone radius
        // rndTex: random seed for this particle

        // 1. Define the activity zone (Donut shape)
        // Active if inside Hover Radius AND outside the Inner "Lock" Radius
        float isInsideOuter = 1.0 - step(uHoverRadius, dist); 
        float isOutsideInner = step(minInteractionDist, dist);
        float isHover = isInsideOuter * isOutsideInner;

        // 2. Animate Texture Index if in Zone
        // Speed: 8.0 near core (Buzz), 0.0 at edge
        float speedNorm = 1.0 - smoothstep(minInteractionDist, uHoverRadius, dist);
        float baseSpeed = 8.0 * speedNorm; 

        // 3. Buzz/Rest Cycle (Intermittent)
        // Cycle length: 3.5s. Active Window: 0.5s.
        // Effect: Particles "sleep" for 3.0s, then "spasm" for 0.5s.
        // cycle
        // Determine Cycle Speed
        // Chaos/Model: 6.0s. Grid (Other State): 10.0s.
        float isGrid = step(0.5, vIsGrid);
        float isOtherState = 1.0 - uIsChaos;
        float cycleLen = mix(6.0, 10.0, isGrid * isOtherState);
        float buzzDuration = 0.75;

        // Cycle logic
        float totalTime = iTime + aStableRandom * 10.0;
        float cycle = mod(totalTime, cycleLen);
        float isBuzzPhase = step(cycleLen - buzzDuration, cycle); 

        float isActive = isHover * isBuzzPhase;
        
        // Count cycles to shift base texture
        float cycleCount = floor(totalTime / cycleLen);
        float baseOffset = cycleCount * 13.0; // Prime number jump

        // Flicker logic (10 swaps per 0.75s = 13.33 Hz)
        float flickSpeed = 13.33;
        float steppedTime = floor((iTime * flickSpeed) + aStableRandom) * isActive;
        
        // If not hovering (isHover=0), steppedTime is 0, so index stays static (aStableRandom*32 + baseOffset)
        // If hovering, it cycles: (Static + Time) % 32
        vTextureIndex = floor(mod((aStableRandom * 32.0) + steppedTime + baseOffset, 32.0));

        vClipPos = gl_Position;
        gl_PointSize = min(320.0, computedSize * uPixelRatio * (20.0 / -mvPosition.z));
    }
`;

export const fragmentShader = `
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
    varying float vIsGrid; // Identify if point is grid or model
    
    // Atlas uniforms
    varying float vTextureIndex;
    uniform float uCols;
    uniform float uRows;
    // NEW UNIFORM DEFINITIONS
    uniform vec3 uLightDir; 
    uniform float uLightStrength;
    uniform float uSizeThreshold;
    varying float vStableRandom; // Received from vertex

    // COLOR SUPPORT
    varying vec3 vColor;
    
    void main() {
        // hide entire point if its computed size (from vertex) is below threshold
        if (vComputedSize < uSizeThreshold) discard;

        // --- Texture Rotation ---
        // Use vertex index to create a pseudo-random rotation speed which is STABLE across morphs
        float speed = 0.5 + fract(sin(vStableRandom * 123.456) * 43758.5453) * 1.5;
        
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
        
        // Fix: Discard if we rotate outside the sprite box
        // This prevents sampling neighboring sprites or background garbage
        if (rotatedCoords.x < 0.0 || rotatedCoords.x > 1.0 || 
            rotatedCoords.y < 0.0 || rotatedCoords.y > 1.0) discard;
        
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

        // --- Dynamic Brightness Adjustment ---
        // Reduce brightness on the left (Light BG) to maintain contrast (Dark points on Light BG)
        // Increase brightness on the right (Dark BG)
        float scrX = gl_FragCoord.x / uResolution.x;
        float isModelBase = 1.0 - smoothstep(0.0, 0.1, vIsGrid);
        
        // Keep points dark (0.1) for the first 50% of screen to avoid blending with the "gray line" area
        float gridBrightness = mix(0.1, 2.5, smoothstep(0.6, 1.0, scrX));
        
        float brightness = mix(gridBrightness, 1.0, isModelBase);
        
        // USE vColor HERE instad of uColor
        vec3 finalColor = vColor * lightIntensity * brightness;
        
        // Add color change on hover
        // Reduce brightness for model points (vIsGrid < 0.001)
        // Grid points can have vIsGrid = 0.25 to 1.0
        float isModel = 1.0 - step(0.0, vIsGrid);
        
        // --- Dynamic Grid Hover Color (Contrast with Background) ---
        // Calculate normalized screen X position (0.0 to 1.0)
        float screenX = gl_FragCoord.x / uResolution.x;
        
        // Approximate the CSS background gradient brightness
        // It decays from ~0.83 at the left to near 0.0 at the right.
        // Formula matching the CSS gradient roughly: 0.83 * exp(-5.0 * x)
        // Smoother linear interpolation from Light (left) to Dark (right)
        float bgLum = mix(1., 0.0, screenX);
        
        // Calculate contrast color:
        // High Lum (Light BG) -> Dark Hover Color (0.0)
        // Low Lum (Dark BG)  -> Bright Hover Color (30.5)
        // We use smoothstep to control the transition point
        float contrastMix = smoothstep(0.0, 0.6, bgLum); 
        vec3 gridHoverColor = mix(vec3(20.), vec3(0.0), contrastMix);
        
        vec3 modelHoverColor = vec3(2.5);   // Lower brightness for model
        
        vec3 hoverColor = mix(gridHoverColor, modelHoverColor, isModel);
        
        float colorMix = smoothstep(uHoverRadius, 0.0, dist);
        finalColor = mix(finalColor, hoverColor * lightIntensity, colorMix);

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;
