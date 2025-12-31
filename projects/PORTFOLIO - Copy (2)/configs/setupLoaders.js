import * as THREE from 'three'; // Assuming you have Three.js installed and can import it

import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

export const gltfLoader = new GLTFLoader();
export const dracoLoader = new DRACOLoader();
// dracoLoader.setDecoderPath( 'jsm/libs/draco/' );
dracoLoader.setDecoderPath('../../examples/jsm/libs/draco/');
// dracoLoader.setDecoderConfig( { type: 'js' } );

// gltfLoader.setDRACOLoader( dracoLoader );
export const rgbeLoader = new RGBELoader();
// export const dracoLoader = new DRACOLoader();
export const textureLoader = new THREE.TextureLoader();