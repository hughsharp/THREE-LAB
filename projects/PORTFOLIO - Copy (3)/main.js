import * as THREE from 'three';
import { setupSCR } from './configs/setupSCR.js';
import { setupStats } from './configs/setupStats.js';
import { setupOrbitControl } from './configs/setupOrbitControl.js';
import { resources } from './projectScripts/resources/loadResources.js';

let camera, scene, renderer;
let orbitControl, stats, mixer;
let pointPairs = [];
const clock = new THREE.Clock();

function assignPresets() {
    [scene, camera, renderer] = setupSCR();
    orbitControl = setupOrbitControl(scene, camera, renderer, true);
}

function localizeConfigs() {
    camera.position.set(17, 4, 10);
    orbitControl.target.set(-3, 4, 0);
    orbitControl.update();
    renderer.setClearColor(0x050505);
}

function setupCharacterPoints(modelScene) {
    const charRoot = modelScene.getObjectByName('a-char');
    if (!charRoot) return;

    modelScene.updateMatrixWorld(true);

    charRoot.traverse((child) => {
        if (child.isSkinnedMesh) {
            // Using a clone of the geometry to prevent attribute conflicts
            const geometry = child.geometry.clone();

            const material = new THREE.ShaderMaterial({
                uniforms: {
                    uBoneTexture: { value: child.skeleton.boneTexture },
                    uBoneTextureSize: { value: child.skeleton.boneTextureSize }
                },
                vertexShader: `
                    attribute vec4 skinIndex;
                    attribute vec4 skinWeight;
                    uniform sampler2D uBoneTexture;
                    uniform int uBoneTextureSize;

                    mat4 getBoneMatrix( const in float i ) {
                        float size = float(uBoneTextureSize);
                        float j = i * 4.0;
                        float x = mod(j, size);
                        float y = floor(j / size);
                        float dx = 1.0 / size;
                        return mat4(
                            texture2D(uBoneTexture, vec2((x + 0.5) * dx, (y + 0.5) * dx)),
                            texture2D(uBoneTexture, vec2((x + 1.5) * dx, (y + 0.5) * dx)),
                            texture2D(uBoneTexture, vec2((x + 2.5) * dx, (y + 0.5) * dx)),
                            texture2D(uBoneTexture, vec2((x + 3.5) * dx, (y + 0.5) * dx))
                        );
                    }

                    void main() {
                        mat4 skinMatrix = 
                            skinWeight.x * getBoneMatrix(skinIndex.x) +
                            skinWeight.y * getBoneMatrix(skinIndex.y) +
                            skinWeight.z * getBoneMatrix(skinIndex.z) +
                            skinWeight.w * getBoneMatrix(skinIndex.w);

                        // Transform position by the bone matrix
                        vec4 skinned = skinMatrix * vec4(position, 1.0);
                        
                        // Standard projection using built-in matrices
                        gl_Position = projectionMatrix * modelViewMatrix * skinned;
                        
                        // Large fixed size for debugging
                        gl_PointSize = 10.0; 
                    }
                `,
                fragmentShader: `
                    void main() {
                        gl_FragColor = vec4(1.0, 0.8, 0.0, 1.0);
                    }
                `,
                transparent: true,
                depthTest: false
            });

            const points = new THREE.Points(geometry, material);

            // Add points to the same parent as the mesh to inherit transforms naturally
            child.parent.add(points);

            // Sync initial matrices
            points.matrix.copy(child.matrix);
            points.matrixAutoUpdate = true;

            pointPairs.push({ points, mesh: child });
            child.material.visible = false;
        }
    });
}

async function init() {
    assignPresets();
    localizeConfigs();
    stats = setupStats();

    if (resources.roomModel) {
        const gltf = resources.roomModel;
        scene.add(gltf.scene);
        scene.environment = resources.environmentMap;

        setupCharacterPoints(gltf.scene);

        if (gltf.animations?.length > 0) {
            mixer = new THREE.AnimationMixer(gltf.scene);
            gltf.animations.forEach(clip => mixer.clipAction(clip).play());
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    pointPairs.forEach((pair) => {
        // Essential: Keep the skeleton updating
        pair.mesh.skeleton.update();

        // Match the position/rotation of the points to the original mesh
        pair.points.position.copy(pair.mesh.position);
        pair.points.rotation.copy(pair.mesh.rotation);
        pair.points.scale.copy(pair.mesh.scale);

        // Update the bone texture reference
        pair.points.material.uniforms.uBoneTexture.value = pair.mesh.skeleton.boneTexture;
    });

    renderer.render(scene, camera);
    if (stats) stats.update();
}

init();
animate();