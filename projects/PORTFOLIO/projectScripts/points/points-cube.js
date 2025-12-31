import * as THREE from 'three';
import { resources } from '../resources/loadResources.js';

export class CubeGrid {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.instancedGrid = null;
        this.dummy = new THREE.Object3D();

        this.init();
    }

    init() {
        // Calculate grid dimensions based on aspect ratio
        const spacing = 1.5;
        const rendererSize = new THREE.Vector2();
        this.scene.renderer.getSize(rendererSize);
        const aspect = rendererSize.x / rendererSize.y;

        // Base the number of rows on a fixed value (e.g., 10) and scale columns by aspect ratio
        const baseRows = 5;
        const gridRows = baseRows;
        const gridCols = Math.round(baseRows * aspect);

        const options = {
            gridCols: gridCols,
            gridRows: gridRows,
            spacing: spacing,
        };

        // Determine total height of the grid
        const gridHeight = gridRows * spacing;

        // Calculate required distance for the camera to see the full height
        // tan(fov/2) = (height/2) / distance
        // distance = (height/2) / tan(fov/2)
        const fovRad = (this.camera.fov * Math.PI) / 180;
        const distance = (gridHeight / 2) / Math.tan(fovRad / 2);

        // Position the camera to center the grid and fit it
        // The grid is centered at (0,0,0) by the loops below, so we just move Z.
        // We add a small buffer (e.g. + 2) to ensure edges aren't cut off precisely at the screen border
        this.camera.position.set(0, 0, distance + 2);
        this.camera.lookAt(0, 0, 0);


        const geometry = new THREE.BoxGeometry(1, 1, 1);

        const texture = resources.spriteSheet;

        // Setup Texture from SpriteSheet
        if (!texture) {
            console.error("SpriteSheet texture not found in resources!");
        } else {
            texture.colorSpace = THREE.SRGBColorSpace;
            console.log("SpriteSheet loaded:", texture);
        }

        const material = new THREE.MeshStandardMaterial({
            color: 0xffffff,
            roughness: 0.2, // Increased roughness to see surface details
            metalness: 0.5, // Reduced metalness to see texture color
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        // Inject custom shader logic to handle sprite frames per instance
        material.onBeforeCompile = (shader) => {
            shader.vertexShader = shader.vertexShader.replace(
                '#include <common>',
                `
                #include <common>
                attribute float aFrame;
                `
            );

            // We use 'map_vertex' because that is where vMapUv is typically assigned.
            // We want to modify vMapUv AFTER it receives the base UV transformation.
            shader.vertexShader = shader.vertexShader.replace(
                '#include <uv_vertex>',
                `
                #include <uv_vertex>
                
                #ifdef USE_MAP
                    float cols = 8.0;
                    float rows = 4.0;
                    
                    float col = mod(aFrame, cols);
                    float row = floor(aFrame / cols);
                    
                    // Flip Y if needed (standard TextureLoader usually flips Y, but let's see)
                    row = rows - 1.0 - row;

                    // Compute the local UV for the sprite slot
                    // We modify 'uv' before it is passed to vMapUv? 
                    // No, 'uv' is an attribute (read-only in GLSL ES 1.0, though mutable in some versions, but better not).
                    // We should use a local variable or modify vUv if available.
                    
                    // Re-declare local UV scalar if needed or just modify the varying later?
                    // The safer bet is to modify the output varying "vMapUv" if it exists.
                    // But vMapUv isn't defined in uv_vertex.
                #endif
                `
            );

            shader.vertexShader = shader.vertexShader.replace(
                '#include <map_vertex>',
                `
                #include <map_vertex>
                
                #ifdef USE_MAP
                    // Apply frame offset to vMapUv
                    // vMapUv is vec2
                    
                    vMapUv.x = (vMapUv.x / cols) + (col / cols);
                    vMapUv.y = (vMapUv.y / rows) + (row / rows);
                #endif
                `
            );
        };

        const count = options.gridCols * options.gridRows;

        // Generate random frame indices for each instance
        const frameIndices = new Float32Array(count);
        for (let i = 0; i < count; i++) {
            frameIndices[i] = Math.floor(Math.random() * 32);
        }
        geometry.setAttribute('aFrame', new THREE.InstancedBufferAttribute(frameIndices, 1));

        this.instancedGrid = new THREE.InstancedMesh(geometry, material, count);
        this.instancedGrid.name = 'cube';

        // Store original positions for calculating jitter
        this.originalPositions = new Float32Array(count * 3);

        let index = 0;
        for (let y = 0; y < options.gridRows; y++) {
            for (let x = 0; x < options.gridCols; x++) {
                const px = (x - options.gridCols / 2 + 0.5) * options.spacing;
                const py = (y - options.gridRows / 2 + 0.5) * options.spacing;
                const pz = 0;

                this.dummy.position.set(px, py, pz);
                this.dummy.updateMatrix();
                this.instancedGrid.setMatrixAt(index, this.dummy.matrix);

                this.originalPositions[index * 3] = px;
                this.originalPositions[index * 3 + 1] = py;
                this.originalPositions[index * 3 + 2] = pz;

                index++;
            }
        }

        this.scene.add(this.instancedGrid);

        // Setup Environment if available
        if (resources.environmentMap) {
            this.scene.environment = resources.environmentMap;
        }
    }

    update() {
        if (this.instancedGrid) {
            // Keep the grid facing the camera
            this.instancedGrid.quaternion.copy(this.camera.quaternion);

            // Apply jitter to each instance
            const jitterAmount = 0.02; // Adjust magnitude of jitter
            const count = this.instancedGrid.count;

            for (let i = 0; i < count; i++) {
                const ox = this.originalPositions[i * 3];
                const oy = this.originalPositions[i * 3 + 1];
                const oz = this.originalPositions[i * 3 + 2];

                this.dummy.position.set(
                    ox + (Math.random() - 0.5) * jitterAmount,
                    oy + (Math.random() - 0.5) * jitterAmount,
                    oz + (Math.random() - 0.5) * jitterAmount
                );
                this.dummy.updateMatrix();
                this.instancedGrid.setMatrixAt(i, this.dummy.matrix);
            }
            this.instancedGrid.instanceMatrix.needsUpdate = true;
        }
    }
}
