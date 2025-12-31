import * as THREE from 'three';
import { setupSCR } from './configs/setupSCR.js';
import { setupStats } from './configs/setupStats.js';
import { setupOrbitControl } from './configs/setupOrbitControl.js';
import { resources } from './projectScripts/resources/loadResources.js';
import { setupCharacterPoints, updateCharacterPoints, toggleMorph } from './projectScripts/points/characterPoints.js';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';
import { Helper } from './configs/setupHelper.js';
import { Customizer } from './configs/setupCustomizer.js';
import { ConstantUniformsCustomizer } from './projectScripts/utils/addConstantUniform.js'; // Uncomment if needed
let camera, scene, renderer;
let orbitControl, stats, mixer;
let helper, customizer;
let constantUniformCustomizer;

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

function addWizards() {
    stats = setupStats();
    helper = new Helper(scene, camera, renderer, orbitControl);
    customizer = new Customizer(scene);
    constantUniformCustomizer = new ConstantUniformsCustomizer(scene);
}

async function init() {
    assignPresets();
    localizeConfigs();
    addWizards();



    if (resources.heroModel) {
        const gltf = resources.heroModel;
        scene.add(gltf.scene);
        scene.environment = resources.environmentMap;


        setupCharacterPoints(gltf.scene);

        if (gltf.animations?.length > 0) {
            mixer = new THREE.AnimationMixer(gltf.scene);
            gltf.animations.forEach(clip => mixer.clipAction(clip).play());
        }

        // Hide all meshes (keeping Points visible)
        scene.traverse((child) => {
            if (child.isMesh && !child.isPoints) {
                child.material.visible = false;
            }
        });

        // GUI Button for Morph
        const btn = document.createElement('button');
        btn.innerText = 'Morph';
        btn.style.position = 'absolute';
        btn.style.bottom = '20px';
        btn.style.left = '50%';
        btn.style.transform = 'translateX(-50%)';
        btn.style.zIndex = 1000;
        btn.style.padding = '10px 20px';
        btn.style.fontSize = '16px';
        btn.style.cursor = 'pointer';
        document.body.appendChild(btn);

        btn.addEventListener('click', () => {
            toggleMorph();
        });
    }
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    if (mixer) mixer.update(delta);
    TWEEN.update();

    updateCharacterPoints();

    renderer.render(scene, camera);
    if (stats) stats.update();
}

init();
animate();