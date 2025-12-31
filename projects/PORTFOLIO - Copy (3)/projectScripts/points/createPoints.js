import * as THREE from 'three';
import Points from './points.js';

// Camera
const CAMERA_FOV = 45;
const CAMERA_NEAR = 0.1;
const CAMERA_FAR = 300;
const CAMERA_POSITION = { x: 61.56, y: 2.97, z: 30 };

// Renderer
const RENDERER_DPR_MAX = 2;

// Create the basic Three.js environment
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    CAMERA_FOV,
    window.innerWidth / window.innerHeight,
    CAMERA_NEAR,
    CAMERA_FAR
);
camera.position.set(CAMERA_POSITION.x, CAMERA_POSITION.y, CAMERA_POSITION.z);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, RENDERER_DPR_MAX));
console.log(window.devicePixelRatio)
renderer.setClearColor(0x000000, 0); // Transparent clear color
document.body.appendChild(renderer.domElement);

// Initialize the Points app
// Note: We don't pass a raycaster here as Points handles fallback internally
const pointsApp = new Points(scene, camera, renderer);

function animate() {
    requestAnimationFrame(animate);
    pointsApp.update();
}

animate();
