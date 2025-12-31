import * as THREE from 'three';
import { setupSCR } from './configs/setupSCR.js';
// import { addConstantUniform} from './projectScripts/addConstantUniform.js';
import { Helper } from './configs/setupHelper.js';
import { Customizer } from './configs/setupCustomizer.js';
import { setupStats } from './configs/setupStats.js';
import { setupOrbitControl } from './configs/setupOrbitControl.js';
import { rgbeLoader } from './configs/setupLoaders.js';
import { Model } from './projectScripts/loadModel.js';
import { addProductBalls } from './projectScripts/addProductBalls.js';
import { Raycaster } from './projectScripts/addRaycaster.js';
import { RAPIERWORLD } from './projectScripts/addRapierWorld.js';
import { ConstantUniformsCustomizer } from './projectScripts/addConstantUniform.js';
import { Bubbles } from './projectScripts/bubble.js'; 
// import {addLights} from './projectScripts/addLights.js';
let camera, scene, renderer;

let orbitControl;
let helper, customizer, constantUniformCustomizer
let stats;
let loadedModel;
let productBalls;
let bubble
let raycaster
let world;
const clock = new THREE.Clock();
const container = document.querySelector('#content');


function assignPresets() {
    [scene, camera, renderer] = setupSCR(container);
    
    orbitControl = setupOrbitControl(scene, camera, renderer);
    // orbitControl.enableZoom = false
}

function localizeConfigs() {
    camera.position.set(17.4192690499384, 4.136164408312478, 0.015309904980740474);
    camera.rotation.set(-0.04520672934354282, 1.5515547851416993, 0.045198372394982464)

    orbitControl.target.set(-3.226367634071287, 4.1182097600816245, -0.38158710192007556)
    orbitControl.update();
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace ;
    renderer.toneMappingExposure = 0.25;
    renderer.physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.shadowMap.type = THREE.BasicShadowMap;
    renderer.shadowMap.enabled = true
    rgbeLoader.load('textures/' + 'peppermint_powerplant_2_1k' + '.hdr', function (texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            scene.environment = texture;
            scene.background = texture
            scene.environmentIntensity = 0.75
            renderer.render(scene, camera);
    })
    
}

function addWizards(){
    stats = setupStats();
    helper = new Helper(scene, camera, renderer, orbitControl);
    customizer = new Customizer(scene);
    constantUniformCustomizer = new ConstantUniformsCustomizer(scene)
}
function init() {
    assignPresets()

    localizeConfigs()
    world = new RAPIERWORLD(scene,false)
    raycaster = new Raycaster(scene, camera, renderer)
    // loadedModel = new Model(scene, camera, renderer); //cost 17fps (43)
    // productBalls = addProductBalls(scene)
    bubble = new Bubbles(scene)
    
    // test()
    
    
    addWizards()
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta() + 0.000001;
    if (renderer && scene && camera) renderer.render(scene, camera);
    if (stats) stats.update();
    if (helper && helper.liveTracking) helper.update()
    if (loadedModel) loadedModel.update(delta);
    if (raycaster && scene.isAdjusted) raycaster.update()
    if (world) world.update(delta)
    if (bubble) bubble.update(delta     )
}

init();
animate();


