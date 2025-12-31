export const vertexShader = `
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
    attribute float aIsGrid;
    
    varying float vTextureIndex;
    // Repulsion uniforms
    uniform vec2 uResolution;
    uniform vec2 uMouseNDC;
    uniform float uHoverRadius;
    uniform float uModelGapRadius;
    uniform vec2 uModelOffset; // New uniform for model offset
    uniform float uModelRotationY; // New uniform for rotation

    // COLOR SUPPORT
    attribute vec3 aColor;
    varying vec3 vColor;

    varying float vComputedSize;
    varying vec4 vClipPos;
    varying float vIsGrid; // Identify if point is grid or model
    
    mat3 rotateY(float theta) {
        float c = cos(theta);
        float s = sin(theta);
        return mat3(
            c, 0, s,
            0, 1, 0,
            -s, 0, c
        );
    }

    float random(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
        vColor = aColor; // Pass color to fragment
        
        // Pseudo-random texture index (0 to 31)
        // Use a different seed combination than the scaling effect (position.xz + position.y)
        float rndTex = random(position.xz * 2.0 + position.y);
        vTextureIndex = floor(rndTex * 32.0);
        
        vIsGrid = aIsGrid;
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
        
        // --- Staggered Appearance (First 3 Seconds) ---
        float appearDuration = 1.0;
        float maxDelay = 2.0;                 // Total time ~3.0s
        
        // Use position to generate a pseudo-random value between 0.0 and 1.0
        float randomVal = random(position.xy + position.zz);
        
        float myDelay = randomVal * maxDelay;
        float appearScale = smoothstep(myDelay, myDelay + appearDuration, iTime);
        computedSize *= appearScale;

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
        
        // --- Apply Model Rotation ---
        // Only apply rotation to model points
        float isModel = 1.0 - step(0.001, aIsGrid);
        if (isModel > 0.5) {
            morphedPos = rotateY(uModelRotationY) * morphedPos;
        }

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
        // isModel is already calculated above
        gl_Position.xy += uModelOffset * gl_Position.w * isModel;

        // --- Repulsion Effect (Screen Space) ---
        // We calculate the screen position of this vertex
        vec2 ndc = gl_Position.xy /gl_Position.w;
        vec2 screenPos = (ndc * 0.5 + 0.5) * uResolution;
        vec2 mouseScreen = (uMouseNDC * 0.5 + 0.5) * uResolution;
        
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
        
        // --- Repulsion ---
        // Only repulse if we are outside the "lock" zone (minInteractionDist)
        // This ensures points we are trying to catch don't run away.
        if (dist < uHoverRadius && dist > minInteractionDist) {
            // Strength is 1.0 at center, 0.0 at edge
            float strength = smoothstep(uHoverRadius, 0.0, dist);
            strength = strength * strength; // Quadratic falloff for subtlety
            
            // Push direction
            vec2 pushDir = normalize(dir);
            if (length(dir) < 0.001) pushDir = vec2(1.0, 0.0); // avoid NaN
            
            // Max displacement amount (reduced for subtlety)
            float maxPush = 25.0; 
            vec2 offset = pushDir * strength * strength *  maxPush;
            
            screenPos += offset;
            
            // Convert back to Clip Space
            vec2 newNdc = (screenPos / uResolution - 0.5) * 2.0;
            gl_Position.xy = newNdc * gl_Position.w;
        }

        vClipPos = gl_Position;
        gl_PointSize = min(160.0, computedSize * uPixelRatio * (20.0 / -mvPosition.z));
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

    // COLOR SUPPORT
    varying vec3 vColor;
    
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
        float isModelBase = 1.0 - step(0.001, vIsGrid);
        
        // Keep points dark (0.1) for the first 50% of screen to avoid blending with the "gray line" area
        float gridBrightness = mix(0.1, 2.5, smoothstep(0.6, 1.0, scrX));
        
        float brightness = mix(gridBrightness, 1.0, isModelBase);
        
        // USE vColor HERE instad of uColor
        vec3 finalColor = vColor * lightIntensity * brightness;
        
        // Add color change on hover
        // Reduce brightness for model points (vIsGrid < 0.001)
        // Grid points can have vIsGrid = 0.25 to 1.0
        float isModel = 1.0 - step(0.001, vIsGrid);
        
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
        float contrastMix = smoothstep(0.0, 0.4, bgLum); 
        vec3 gridHoverColor = mix(vec3(20.), vec3(0.0), contrastMix);
        
        vec3 modelHoverColor = vec3(2.5);   // Lower brightness for model
        
        vec3 hoverColor = mix(gridHoverColor, modelHoverColor, isModel);
        
        float colorMix = smoothstep(uHoverRadius, 0.0, dist);
        finalColor = mix(finalColor, hoverColor * lightIntensity, colorMix);

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;
