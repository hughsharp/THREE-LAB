import * as THREE from 'three';
import { gltfLoader, rgbeLoader, textureLoader, dracoLoader, handleProgress, registerFile } from '../../configs/setupLoaders.js';

const roomGLB = 'room8.glb';
const roomHDR = 'peppermint_powerplant_2_1k.hdr';
async function loadResources() {
    const resources = {
        roomModel: null,
        environmentMap: null,
        textures: [],
    };

    // Register files for precise progress scaling
    registerFile(roomGLB);
    registerFile(roomHDR);

    const loadGLTF = new Promise((resolve) => {
        // Resolve immediately if logic is commented out, otherwise it waits forever!
        // resolve();
        gltfLoader.setDRACOLoader(dracoLoader);
        gltfLoader.load(
            './models/' + roomGLB,
            (gltf) => {
                resources.roomModel = gltf;
                resolve();
            },
            (xhr) => {
                handleProgress(roomGLB, xhr.loaded, xhr.total);
            }
        );
    });

    const loadHDR = new Promise((resolve) => {
        rgbeLoader.load(
            './textures/' + roomHDR,
            (texture) => {
                resources.environmentMap = texture;
                texture.mapping = THREE.EquirectangularReflectionMapping;
                resolve();
            },
            (xhr) => {
                handleProgress(roomHDR, xhr.loaded, xhr.total);
            }
        );
    });

    await Promise.all([loadGLTF, loadHDR]);
    return resources;
}

export const resources = await loadResources();