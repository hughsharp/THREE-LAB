import * as THREE from 'three'; // Assuming you have Three.js installed and can import it
import Stats from 'three/addons/libs/stats.module.js';
export function setupSCR(domElement=undefined) { //Scene Camera Renderer
    // Determine initial size
    let width, height;
    if (domElement) {
        const rect = domElement.getBoundingClientRect();
        width = rect.width;
        height = rect.height;
    } else {
        width = window.innerWidth;
        height = window.innerHeight;
    }

    const camera = new THREE.PerspectiveCamera(50, width / height, 2, 500);
    camera.name = 'camera';

    const scene = new THREE.Scene();
    scene.name = 'scene'
    scene.background = new THREE.Color(0x000000); // Set background color to black
    scene.width = width
    scene.height = height

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        stencil: false,
        alpha: true
    });
    renderer.name = 'renderer';
    renderer.shadowMap.enabled = true;
    renderer.physicallyCorrectLights = true;
    renderer.setPixelRatio(window.devicePixelRatio * 1);
    renderer.setSize(width, height);

    function onResize() {
        let w, h;
        if (domElement) {
            const rect = domElement.getBoundingClientRect();
            w = rect.width;
            h = rect.height;
        } else {
            w = window.innerWidth;
            h = window.innerHeight;
        }
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.render(scene, camera);
        scene.width = w
        scene.height = h
    }

    if (domElement) {
        domElement.appendChild(renderer.domElement);
        // Listen for resize on window, but use domElement size
        window.addEventListener('resize', onResize);
    } else {
        document.body.appendChild(renderer.domElement);
        window.addEventListener('resize', onResize);
    }

    return [scene, camera, renderer];
}