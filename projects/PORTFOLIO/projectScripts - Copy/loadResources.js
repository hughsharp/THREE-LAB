import * as THREE from 'three';
import { gltfLoader, rgbeLoader, textureLoader, dracoLoader } from '../configs/setupLoaders.js';


async function loadResources() {
    const resources = {
        roomModel: null,
        environmentMap: null,
        textures: [],
    };

    const loadGLTF = new Promise((resolve) => {
        // Resolve immediately if logic is commented out, otherwise it waits forever!
        // resolve();
        gltfLoader.setDRACOLoader(dracoLoader);
        gltfLoader.load('./models/room3.glb', (gltf) => {
            resources.roomModel = gltf;
            resolve(); // Original resolve was here
        });
    });

    const loadHDR = new Promise((resolve) => {
        rgbeLoader.load('./textures/peppermint_powerplant_2_1k.hdr', (texture) => {
            resources.environmentMap = texture;
            texture.mapping = THREE.EquirectangularReflectionMapping;
            resolve();
        });
    });

    await Promise.all([loadGLTF, loadHDR]);
    return resources;
}

export const resources = await loadResources();