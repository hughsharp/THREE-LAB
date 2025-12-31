import * as THREE from 'three';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';

let pointPairs = [];
let isMorphed = false; // 0 = Chaos, 1 = Model. Start at 0.

export function setupCharacterPoints(modelScene) {
    const charRoot = modelScene.getObjectByName('Armature');
    if (!charRoot) return;

    modelScene.updateMatrixWorld(true);

    const skinnedMeshes = [];
    let totalVertices = 0;
    const meshStats = [];

    charRoot.traverse((child) => {
        if (child.isSkinnedMesh || child.isMesh) {
            skinnedMeshes.push(child);
            const count = child.geometry.attributes.position.count;
            totalVertices += count;
            meshStats.push({ name: child.name, vertices: count });
        }
    });

    const TOTAL_POINTS = 100000;

    console.group('Character Points Geometry Stats');
    console.log('Total Vertices of GLB Model:', totalVertices);
    console.log('Vertices Left (100k - Total):', TOTAL_POINTS - totalVertices);
    console.table(meshStats);
    console.groupEnd();

    // Global free index for continuous grid layout
    let globalFreeIndex = 0;
    const gridCols = 150;
    const gridSpacing = 0.4;

    skinnedMeshes.forEach((child) => {
        const originalGeo = child.geometry;
        const originalCount = originalGeo.attributes.position.count;

        // Distribute points proportionally
        const count = Math.floor((originalCount / totalVertices) * TOTAL_POINTS);

        if (count === 0) return;

        // 1. Create BufferGeometry
        const geometry = new THREE.BufferGeometry();

        // 2. Attributes
        const posArray = new Float32Array(count * 3);
        const normalArray = new Float32Array(count * 3);
        const uvArray = new Float32Array(count * 2);
        const targetPos = new Float32Array(count * 3);
        const skinIndex = new Float32Array(count * 4);

        // SKIN WEIGHT INTERPOLATION
        const startSkinWeight = new Float32Array(count * 4); // Start at 0
        const targetSkinWeight = new Float32Array(count * 4); // Real Weights

        // INTERPOLATION EXPERIMENT
        const startIsModelArray = new Float32Array(count);
        const targetIsModelArray = new Float32Array(count);

        const origPos = originalGeo.attributes.position;
        const origSkinIndex = originalGeo.attributes.skinIndex;
        const origSkinWeight = originalGeo.attributes.skinWeight;

        for (let i = 0; i < count; i++) {
            // Is this a real model vertex or a "free" filler vertex?
            const isModel = i < originalCount;

            // --- CHAOS POSITION (Start State) ---
            const spread = isModel ? 1.0 : 50.0; // Closer for model, wide for free

            // Random Chaos (Center around height ~4.0)
            const chaosRange = spread * 2.0;
            posArray[i * 3 + 0] = (Math.random() - 0.5) * chaosRange;
            posArray[i * 3 + 1] = (Math.random() - 0.5) * chaosRange + 4.0;
            posArray[i * 3 + 2] = (Math.random() - 0.5) * chaosRange;

            // Init Start state (Chaos) as 0
            startIsModelArray[i] = 0.0;
            startSkinWeight[i * 4 + 0] = 0; // Explicitly 0
            startSkinWeight[i * 4 + 1] = 0;
            startSkinWeight[i * 4 + 2] = 0;
            startSkinWeight[i * 4 + 3] = 0;

            if (isModel) {
                // --- MODEL POINT ---
                targetIsModelArray[i] = 1.0;

                // Source Index
                const srcIndex = i;

                // Target Position (Model Rest Pose)
                targetPos[i * 3 + 0] = origPos.getX(srcIndex);
                targetPos[i * 3 + 1] = origPos.getY(srcIndex);
                targetPos[i * 3 + 2] = origPos.getZ(srcIndex);

                // Copy Skinning Data
                if (origSkinIndex) {
                    skinIndex[i * 4 + 0] = origSkinIndex.getX(srcIndex);
                    skinIndex[i * 4 + 1] = origSkinIndex.getY(srcIndex);
                    skinIndex[i * 4 + 2] = origSkinIndex.getZ(srcIndex);
                    skinIndex[i * 4 + 3] = origSkinIndex.getW(srcIndex);
                }
                if (origSkinWeight) {
                    targetSkinWeight[i * 4 + 0] = origSkinWeight.getX(srcIndex);
                    targetSkinWeight[i * 4 + 1] = origSkinWeight.getY(srcIndex);
                    targetSkinWeight[i * 4 + 2] = origSkinWeight.getZ(srcIndex);
                    targetSkinWeight[i * 4 + 3] = origSkinWeight.getW(srcIndex);
                }

            } else {
                // --- FREE POINT (GRID BACKGROUND) ---
                targetIsModelArray[i] = 0.0;

                // Calculate Grid Position
                const gx = globalFreeIndex % gridCols;
                const gy = Math.floor(globalFreeIndex / gridCols);
                globalFreeIndex++;

                // Center the grid
                const xPos = (gx - gridCols / 2) * gridSpacing;
                const yPos = gy * gridSpacing - 10.0; // Start lower
                const zPos = -10.0; // Behind the character

                targetPos[i * 3 + 0] = xPos;
                targetPos[i * 3 + 1] = yPos + 4.0;
                targetPos[i * 3 + 2] = zPos;

                // Dummy Skinning
                targetSkinWeight[i * 4 + 0] = 0;
            }

            // Fill random other attrs
            normalArray[i * 3] = (Math.random() - 0.5);
            normalArray[i * 3 + 1] = (Math.random() - 0.5);
            normalArray[i * 3 + 2] = (Math.random() - 0.5);
            uvArray[i * 2] = Math.random();
            uvArray[i * 2 + 1] = Math.random();
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
        geometry.setAttribute('normal', new THREE.BufferAttribute(normalArray, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uvArray, 2));
        geometry.setAttribute('targetPosition', new THREE.BufferAttribute(targetPos, 3));
        geometry.setAttribute('skinIndex', new THREE.BufferAttribute(skinIndex, 4));

        // Weight Attributes
        geometry.setAttribute('skinWeight', new THREE.BufferAttribute(startSkinWeight, 4)); // Dummy
        geometry.setAttribute('aStartSkinWeight', new THREE.BufferAttribute(startSkinWeight, 4));
        geometry.setAttribute('aTargetSkinWeight', new THREE.BufferAttribute(targetSkinWeight, 4));

        geometry.setAttribute('aStartIsModel', new THREE.BufferAttribute(startIsModelArray, 1));
        geometry.setAttribute('aTargetIsModel', new THREE.BufferAttribute(targetIsModelArray, 1));


        // 4. Create ShaderMaterial
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uProgress: { value: 0.0 }, // 0 = Chaos, 1 = Model/Grid
                uColor: { value: new THREE.Color(0xffd700) },
                uSize: { value: 5.0 },
                uTime: { value: 0.0 }
            },
            vertexShader: `
                uniform float uProgress;
                uniform float uSize;
                uniform float uTime;
                
                attribute vec3 targetPosition;
                // attribute float aIsModel; // Removed
                
                // attribute float aIsModel; // Removed
                
                attribute float aStartIsModel;
                attribute float aTargetIsModel;
                
                // My Custom Weight Attributes
                attribute vec4 aStartSkinWeight;
                attribute vec4 aTargetSkinWeight;

                #include <common>
                #include <skinning_pars_vertex>

                void main() {
                    vec3 finalTargetPos = targetPosition;

                    // Interpolate IsModel
                    float isModel = mix(aStartIsModel, aTargetIsModel, uProgress);
                    
                    // Interpolate Weights (Global blend)
                    vec4 curSkinWeight = mix(aStartSkinWeight, aTargetSkinWeight, uProgress);
                    float weightSum = dot(curSkinWeight, vec4(1.0));

                    if (isModel > 0.0001) {
                        // --- SKINNED LOGIC ---
                        // 1. Calculate the Skinned Postion
                        vec3 transformed = targetPosition; 

                        // --- MANUAL SKINNING IMPLEMENTATION (Replaces #include <skinning_vertex>) ---
                        #ifdef USE_SKINNING
                            mat4 boneMatX = getBoneMatrix( skinIndex.x );
                            mat4 boneMatY = getBoneMatrix( skinIndex.y );
                            mat4 boneMatZ = getBoneMatrix( skinIndex.z );
                            mat4 boneMatW = getBoneMatrix( skinIndex.w );
                        
                            vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
                            vec4 skinned = vec4( 0.0 );
                            skinned += boneMatX * skinVertex * curSkinWeight.x;
                            skinned += boneMatY * skinVertex * curSkinWeight.y;
                            skinned += boneMatZ * skinVertex * curSkinWeight.z;
                            skinned += boneMatW * skinVertex * curSkinWeight.w;
                            transformed = ( bindMatrixInverse * skinned ).xyz;
                        #endif
                        
                        // 2. Blend from Static (Bind Pose) to Skinned (Animated Pose)
                        // If weights are 0 (e.g. Chaos), weightSum is 0, so we use full Bind Pose.
                        // If weights are Full, weightSum is 1, so we use Skinned.
                        // If weights are 0.5 (Mid-morph), we use 50% Skinned (which is shrunken) but blended 50% with Bind.
                        // This replicates the characterPoints.js effect.
                        
                        // Ensure weightSum is used as the blend factor (clamped to 0-1)
                        float influence = clamp(weightSum, 0.0, 1.0);
                        
                        // BUT: logic in characterPoints was: finalTargetPos = mix(targetPosition, transformed, isModel);
                        // Here we use weightSum as a proxy for "How much skinning should apply".
                        finalTargetPos = mix(targetPosition, transformed, influence);
                    } 
                    // else { finalTargetPos remains targetPosition (The Grid) }

                    // --- CHAOS -> ORDER TRANSITION ---
                    vec3 chaosPos = position;
                    
                    // Mix: Chaos -> (Skinned Model OR Grid)
                    vec3 finalPos = mix(chaosPos, finalTargetPos, uProgress);

                    vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
                    gl_Position = projectionMatrix * mvPosition;

                    // Size
                    gl_PointSize = uSize * (10.0 / -mvPosition.z);
                    
                    // Fade free points a bit?
                    if (isModel < 0.5) {
                         // Make grid points slightly smaller or different
                         gl_PointSize *= 0.8;
                    }
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                void main() {
                    if (length(gl_PointCoord - vec2(0.5)) > 0.5) discard;
                    gl_FragColor = vec4(uColor, 1.0);
                }
            `,
            skinning: true,
            transparent: true
        });


        // 5. Create Points
        const points = new THREE.Points(geometry, material);

        // 6. Bind Skeleton (Even if mixed, we generally need it for the model parts)
        points.skeleton = child.skeleton;
        points.bindMatrix = child.bindMatrix;
        points.bindMatrixInverse = child.bindMatrixInverse;
        points.isSkinnedMesh = true;

        points.frustumCulled = false;

        // Add points to the same parent as the mesh
        child.parent.add(points);
        pointPairs.push({ points, mesh: child });

        // Allow accessing material to change progress
        points.userData.material = material;

        // Hide original
        child.material.visible = false;
    });
}

export function toggleMorph() {
    isMorphed = !isMorphed;
    const targetProgress = isMorphed ? 1.0 : 0.0;

    pointPairs.forEach(pair => {
        new TWEEN.Tween(pair.points.material.uniforms.uProgress)
            .to({ value: targetProgress }, 2000) // 2 second transition
            .easing(TWEEN.Easing.Quadratic.InOut)
            .start();
    });
}

export function updateCharacterPoints() {
    pointPairs.forEach((pair) => {
        const material = pair.points.material;
        if (material.uniforms.uTime) {
            material.uniforms.uTime.value = performance.now() * 0.001;
        }

        // Force skeleton update
        pair.mesh.skeleton.update();

        // Sync Transform (if the mesh moves in world space)
        pair.points.position.copy(pair.mesh.position);
        pair.points.rotation.copy(pair.mesh.rotation);
        pair.points.scale.copy(pair.mesh.scale);
    });
}
