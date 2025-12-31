import * as THREE from 'three'; // Assuming you have Three.js installed and can import it

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

const manager = new THREE.LoadingManager();

// Custom Progress Tracking
const progressMap = new Map();

export function registerFile(url) {
    progressMap.set(url, { loaded: 0, total: 0 });
}

export function handleProgress(url, loaded, total) {
    if (total === 0) return; // Prevent division by zero

    // Update the specific file's data
    progressMap.set(url, { loaded, total });

    let totalLoaded = 0;
    let totalSize = 0;
    let knownTotalCount = 0;

    progressMap.forEach((data) => {
        totalLoaded += data.loaded;
        totalSize += data.total;
        if (data.total > 0) {
            knownTotalCount++;
        }
    });

    const totalFiles = progressMap.size;

    // Base percentage from known files
    let rawPercentage = totalSize > 0 ? (totalLoaded / totalSize) : 0;

    // Scale by how many files we have size info for (prevents 100% jump when waiting for second file)
    let scaledProgress = 0;
    if (totalFiles > 0) {
        scaledProgress = rawPercentage * (knownTotalCount / totalFiles);
    }

    const progress = Math.round(scaledProgress * 100);

    const progressText = document.getElementById('progress-text');
    const progressBar = document.getElementById('progress-bar');

    if (progressText) progressText.innerText = progress + '%';
    if (progressBar) progressBar.style.width = progress + '%';
}

manager.onStart = function (url, itemsLoaded, itemsTotal) {
    // Optional: Reset or log start
};

manager.onLoad = function () {
    // Integrity check at the end
    let allLoaded = true;
    progressMap.forEach(d => {
        if (d.loaded < d.total || d.total === 0) allLoaded = false;
    });

    if (allLoaded && progressMap.size > 0) {
        const progressText = document.getElementById('progress-text');
        const progressBar = document.getElementById('progress-bar');
        if (progressText) {
            progressText.innerText = '100%';
        }
        if (progressBar) progressBar.style.width = '100%';
    }
};

// manager.onProgress = ... (Removed in favor of specific byte tracking)

export const gltfLoader = new GLTFLoader(manager);
export const dracoLoader = new DRACOLoader(manager);
// dracoLoader.setDecoderPath( 'jsm/libs/draco/' );
dracoLoader.setDecoderPath('../../examples/jsm/libs/draco/');
// dracoLoader.setDecoderConfig( { type: 'js' } );

// gltfLoader.setDRACOLoader( dracoLoader );
export const rgbeLoader = new RGBELoader(manager);
// export const dracoLoader = new DRACOLoader();
export const textureLoader = new THREE.TextureLoader(manager);