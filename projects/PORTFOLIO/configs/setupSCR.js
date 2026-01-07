import * as THREE from 'three';
import Stats from 'three/addons/libs/stats.module.js';

export function setupSCR(options = {}) { //Scene Camera Renderer
    const domElement = options.domElement || undefined;
    const fogEnabled = options.fogEnabled || false;
    const alpha = options.alpha || false;

    // --- 1. Determine Parent Element and Size ---
    let parentWidth, parentHeight;
    const parentElement = domElement || document.body;
    console.log('Parent Element:', parentElement);
    if (domElement) {
        const rect = domElement.getBoundingClientRect();
        parentWidth = rect.width;
        parentHeight = rect.height;
        // Ensure parent has a non-static position for absolute positioning
        if (getComputedStyle(parentElement).position === 'static') {
            parentElement.style.position = 'relative';
        }
    } else {
        parentWidth = window.innerWidth;
        parentHeight = window.innerHeight;
    }

    // --- 2. Calculate Container Size (100% height, 80% width) ---
    let containerWidth = parentWidth * 1;
    let containerHeight = parentHeight; // 100% height

    // --- 3. Create and Style the Right-Aligned Child Container ---
    const threeJsContainer = document.createElement('div');
    threeJsContainer.id = 'threeJsContainer';

    // Set the parent's background to black to cover the 20% area
    // If domElement is not passed, document.body background must be black,
    // but setting scene.background (step 4) and using a container is usually enough.
    // To explicitly ensure the 20% area is black, we'll rely on scene.background 
    // and make sure the container doesn't overlap the left area.

    threeJsContainer.style.cssText = `
        position: absolute;
        width: ${containerWidth}px;
        height: ${containerHeight}px;
        top: 0;
        right: 0; /* Aligns the container to the right edge */
        overflow: hidden;
    `;

    parentElement.appendChild(threeJsContainer);

    // --- 4. Setup Three.js elements using the Container Size ---
    const camera = new THREE.PerspectiveCamera(50, containerWidth / containerHeight, 2, 800);
    camera.name = 'camera';

    const scene = new THREE.Scene();
    scene.name = 'scene'
    // This background color ensures that any empty space *within the container* is black.
    // scene.background = new THREE.Color(0x000000);
    scene.width = containerWidth
    scene.height = containerHeight

    // ⭐ Conditional Fog Implementation based on new argument
    if (fogEnabled) {
        const fogColor = 0x000000;
        const nearDistance = 2;
        const farDistance = 500;
        scene.fog = new THREE.Fog(fogColor, nearDistance, farDistance);
    }

    const renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        stencil: false,
        alpha: alpha
    });
    renderer.name = 'renderer';
    renderer.shadowMap.enabled = true;
    renderer.physicallyCorrectLights = true;
    // REVERT: Back to 0.8 as 0.6 was too low res.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5) * 0.8);
    // console.log(window.devicePixelRatio)
    renderer.setSize(containerWidth, containerHeight);

    // Append the renderer's DOM element to the new container
    threeJsContainer.appendChild(renderer.domElement);

    // --- 5. Resize Functionality Update ---
    function onResize() {
        // Recalculate parent size
        let parentW, parentH;
        if (domElement) {
            const rect = domElement.getBoundingClientRect();
            parentW = rect.width;
            parentH = rect.height;
        } else {
            parentW = window.innerWidth;
            parentH = window.innerHeight;
        }

        // Calculate new container size (100% H, 80% W)
        const w = parentW * 1;
        const h = parentH;

        // Update the container's size and positioning in CSS
        threeJsContainer.style.width = w + 'px';
        threeJsContainer.style.height = h + 'px';
        threeJsContainer.style.right = '0'; // Re-affirm right alignment

        // Update Three.js elements using the new container size
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.render(scene, camera);
        scene.width = w
        scene.height = h
    }

    window.addEventListener('resize', onResize);

    // --- 6. Attach references and return ---
    scene.domElement = threeJsContainer;
    scene.renderer = renderer
    scene.camera = camera

    scene.add(camera)
    return [scene, camera, renderer];
}