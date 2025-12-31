import * as THREE from 'three';
import { setupSCR } from './configs/setupSCR.js';
import { Helper } from './configs/setupHelper.js';
import { Customizer } from './configs/setupCustomizer.js';
import { setupStats } from './configs/setupStats.js';
import { setupOrbitControl } from './configs/setupOrbitControl.js';
import { rgbeLoader } from './configs/setupLoaders.js';
import { Model } from './projectScripts/loadModel.js';
import { runIntroScenario } from './projectScripts/scenario/runScenario.js';
import Points from './projectScripts/points/points.js';

import { Raycaster } from './projectScripts/raycast/addRaycaster.js';
import { RAPIERWORLD } from './projectScripts/addRapierWorld.js';

import { ConstantUniformsCustomizer } from './projectScripts/addConstantUniform.js'; // Uncomment if needed

let camera, scene, renderer;
let orbitControl;
let helper, customizer;
let constantUniformCustomizer;
let stats;
let loadedModel;
let world;
let raycaster;
let pointsApp;
const clock = new THREE.Clock();
// clock.stop();


// UI Elements (Needed for the Loading Phase)
const progressText = document.getElementById('progress-text');
const progressBar = document.getElementById('progress-bar');

function assignPresets() {
    [scene, camera, renderer] = setupSCR();
    orbitControl = setupOrbitControl(scene, camera, renderer, true);
    orbitControl.enableZoom = false;
    // orbitControl.enablePan = false;
    // orbitControl.enabled = false
}

function localizeConfigs() {
    // 1. Camera & Orbit Setup
    camera.position.set(17.4192690499384, 4.136164408312478, 0.015309904980740474);
    camera.rotation.set(-0.04520672934354282, 1.5515547851416993, 0.045198372394982464);

    orbitControl.target.set(-3.226367634071287, 4.1182097600816245, -0.38158710192007556);
    orbitControl.update();

    // 2. Renderer Look & Feel (Fully Restored)
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    renderer.toneMappingExposure = 0.25;
    renderer.physicallyCorrectLights = true; // Note: In newer Three.js (r155+), use renderer.useLegacyLights = false
    renderer.toneMapping = THREE.CineonToneMapping;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    renderer.shadowMap.enabled = true;

    // 3. HDR Environment Load
    rgbeLoader.load('textures/' + 'peppermint_powerplant_2_1k' + '.hdr', function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        scene.environmentIntensity = 0.75;
        // renderer.render(scene, camera); // Let loop handle it
    });
}

function addWizards() {
    stats = setupStats();
    // helper = new Helper(scene, camera, renderer, orbitControl);
    customizer = new Customizer(scene);
    constantUniformCustomizer = new ConstantUniformsCustomizer(scene);
}

async function init() {
    assignPresets();

    // Initialize Points App with existing global scene/camera/renderer
    // Note: Raycaster is not passed here yet as it depends on `scene` which is ready, but `raycaster` var is updated LATER.
    // Wait, step 340 updated Points constructor to accept raycaster.
    // Ideally we init raycaster BEFORE Points.

    localizeConfigs(); // Contains renderer settings

    raycaster = new Raycaster(scene, camera, renderer);

    // Now init Points with raycaster
    // pointsApp = new Points(scene, camera, renderer, raycaster);

    // Initialize World (Paused by default)
    world = new RAPIERWORLD(scene, { debuggerEnabled: false, isActive: false });

    addWizards();

    // --- Main Initialization Flow ---

    // 1. Instantiate the Model class
    loadedModel = new Model(scene, camera, renderer);

    try {
        // 2. Wait for Model Assets & Physics to Load
        await loadedModel.init(progressText, progressBar);

        // 3. Run the Intro Scenario
        await runIntroScenario(scene, camera, orbitControl, clock);

    } catch (error) {
        console.error("Fatal Error during Initialization:", error);
        if (progressText) progressText.innerText = "Error Loading";
    }
}

function animate() {
    requestAnimationFrame(animate);

    // When clock.stop() is called in the scenario, getDelta() returns 0.
    // This effectively pauses animations and physics.
    const delta = clock.getDelta();

    // Use Points App for rendering (includes Bloom + Scene)
    // if (pointsApp) {
    //     pointsApp.update();
    // } else if (renderer && scene && camera) {
    //     renderer.render(scene, camera);
    // }
    if (renderer && scene && camera) renderer.render(scene, camera);

    if (stats) stats.update();
    if (helper && helper.liveTracking) helper.update();

    // These update functions rely on 'delta'.
    // If delta is 0, they pause automatically.
    if (loadedModel) loadedModel.update(delta);
    if (world) world.update(delta);

    if (raycaster && scene.isAdjusted) raycaster.update();
    if (orbitControl) orbitControl.edgeControlUpdate();
}

init();
animate();