import * as THREE from 'three';
import { setupSCR } from './configs/setupSCR.js';
// import { addConstantUniform} from './projectScripts/addConstantUniform.js';
import { Helper } from './configs/setupHelper.js';
import { Customizer } from './configs/setupCustomizer.js';
import { setupStats } from './configs/setupStats.js';
import { setupOrbitControl } from './configs/setupOrbitControl.js';
import { rgbeLoader } from './configs/setupLoaders.js';
import { Model } from './projectScripts/loadModel.js';
import { Intro } from './projectScripts/loadIntro.js';
import { addProductBalls } from './projectScripts/addProductBalls.js';
import { Raycaster } from './projectScripts/addRaycaster.js';
import { RAPIERWORLD } from './projectScripts/addRapierWorld.js';
import { ConstantUniformsCustomizer } from './projectScripts/addConstantUniform.js';
import { Bubbles } from './projectScripts/bubble.js';
import { addConstantUniform} from './projectScripts/addConstantUniform.js';

// import  MeshReflectorMaterial  from 'three/addons/materials/MeshReflectorMaterial.js';
import MeshReflectorMaterial from 'postprocessing-extra/materials/MeshReflectorMaterial.js';
// import {addLights} from './projectScripts/addLights.js';


            import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
            import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
            import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
            import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

            import { FXAAPass } from 'three/addons/postprocessing/FXAAPass.js';



            // import { EffectComposer } from 'postprocessing-extra/core/EffectComposer.js';
            // import { SelectiveBloomEffect } from 'postprocessing-extra/effects/SelectiveBloomEffect.js';
            // import { EffectPass } from 'postprocessing-extra/passes/EffectPass.js';
            // import { RenderPass } from 'postprocessing-extra/passes/RenderPass.js';
            // import { BlendFunction } from 'postprocessing-extra/enums/BlendFunction.js';


            let composer, fxaaPass, bloomEffect


let camera, scene, renderer;
let loadingManager
let orbitControl;
let helper, customizer, constantUniformCustomizer
let stats;
let loadedModel;
let intro;
let productBalls;
let bubble
let raycaster
let world;
const clock = new THREE.Clock();
const container = document.querySelector('#content');

// function setupLoadingManager() {
//     const loadingScreen = document.createElement('div');
//     // (Add all the loading screen styles here...)
//     loadingScreen.style.position = 'absolute';
//     loadingScreen.style.top = '0';
//     loadingScreen.style.left = '0';
//     loadingScreen.style.width = '100%';
//     loadingScreen.style.height = '100%';
//     loadingScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
//     loadingScreen.style.display = 'flex';
//     loadingScreen.style.justifyContent = 'center';
//     loadingScreen.style.alignItems = 'center';
//     loadingScreen.style.color = 'white';
//     loadingScreen.innerHTML = 'Loading...';
//     document.body.appendChild(loadingScreen);

//     const manager = new THREE.LoadingManager();

//     manager.onLoad = function () {
//         loadingScreen.style.display = 'none';
//     };

//     manager.onError = function (url) {
//         console.error('Error loading ' + url);
//         loadingScreen.innerHTML = 'Error loading assets.';
//     };

//     return manager;
// }

function setupReflection(floor){
    const options = {
        enableHelper: true,
        // resolution: 512,
        // mixStrength: 1.5,
        // mirror: 0.6,
        // color: 0xaaaaaa, // A slightly grey floor gives better contrast
        
        // // --- NEW SETTINGS IN ACTION ---
        // depthBlur: true,
        // depthBlurMin: 1.15,   // Start blurring reflections of things 0.2 units away from the floor
        // depthBlurMax: 30,   // Reflections are fully blurred at 1.0 unit away from the floor
        // depthBlurBias: 20, // A slight overall blur
        // blurKernelSize: 2,
        // depthBlurFalloff : 10.0, // Controls the curve of the blur transition
        blur: [128, 128],
        mixStrength: 0.77,
        mirror: 0.25,         // A high base blur to make the effect obvious
        depthScale: 50,           // Enable the effect with high intensity
        minDepthThreshold: 0.4,    // Start blurring at 40% distance
        maxDepthThreshold: 1.0,    // Objects at the surface are sharp
        depthToBlurRatioBias: 0.25  // Add a subtle base blur everywhere
    }
    console.log(floor)
    floor.material = new MeshReflectorMaterial(renderer, camera, scene, floor, options);
    floor.material.toneMapped = false
    // floor.material.color = new THREE.Color('red')
    console.log(floor.material)
    floor.material.toneMapped = false
}
function assignPresets() {
    [scene, camera, renderer] = setupSCR(container);

    orbitControl = setupOrbitControl(scene, camera, renderer);
    addConstantUniform(scene)
    // loadingManager = setupLoadingManager()
    // orbitControl.enableZoom = false
}

function addLights(scene) {
    // Ambient light to provide overall illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    ambientLight.name = 'AmbientLight';
    scene.add(ambientLight);

    // Spotlight for casting shadows and creating highlights
    const spotLight = new THREE.SpotLight(0xffffff, 100, 0, 0.2, 1);
    spotLight.name = 'SpotLight';
    spotLight.position.set(0, 30, 0);
    spotLight.penumbra = 1;
    spotLight.angle = 0.2;
    spotLight.color.set('white');
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    scene.add(spotLight);

    // Directional lights for adding color and depth
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 4);
    directionalLight1.name = 'DirectionalLight(White)';
    directionalLight1.position.set(0, 5, -4);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight('red', 4);
    directionalLight2.name = 'DirectionalLight(Red)';
    directionalLight2.position.set(0, -15, -0);
    // scene.add(directionalLight2);
}

function enableBloom(scene){
    scene.renderer.toneMappingExposure = 1
    const params = {
            threshold: 0.95,
            strength: 0.13,
            radius: -0.51,
            exposure: 0.15
        };
                const renderScene = new RenderPass( scene, camera );
                renderScene.clearAlpha = 0

                fxaaPass = new FXAAPass();

        const bloomPass = new UnrealBloomPass( new THREE.Vector2( window.innerWidth, window.innerHeight ), params.strength, params.radius, params.threshold );
        // bloomPass.threshold = params.threshold;
        // bloomPass.strength = params.strength;
        // bloomPass.radius = params.radius;

        const outputPass = new OutputPass();

        composer = new EffectComposer( renderer );
        composer.addPass( renderScene );
        composer.addPass( bloomPass );
        composer.addPass( outputPass );
        composer.addPass( fxaaPass );

    // composer = new EffectComposer(renderer);
    // composer.addPass(new RenderPass(scene, camera));

    // bloomEffect = new SelectiveBloomEffect(scene, camera, {
    //     radius: 1,
    //     intensity: 2.0,
    //     // ✨ Change this value to be very high
    //     luminanceThreshold: 0.02, 
    //     luminanceSmoothing: 1,
    //     kernelSize: 3,
    // });

    // composer.addPass(new EffectPass(camera, bloomEffect));
}


function setGlobalConfigs() {
    camera.position.set(17.4192690499384, 4.136164408312478, 20); // Moved camera back a bit
    camera.lookAt(0,0,0);

    orbitControl.target.set(0, 0, 0);
    orbitControl.update();

    renderer.outputColorSpace = THREE.SRGBColorSpace; // Use SRGB for better color
    renderer.toneMappingExposure = 1.5; // Increased exposure for a brighter scene
    renderer.physicallyCorrectLights = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping; // A more cinematic tone mapping
    // renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Softer shadows
    // renderer.shadowMap.enabled = true;

    rgbeLoader.load('textures/' + 'peppermint_powerplant_2_1k' + '.hdr', function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
        // scene.background = texture; // Disabled background to see lights better
        // scene.background = new THREE.Color('#D0DBEC'); // Dark background C2DFFF
        scene.environmentIntensity = 1.0; // Increased intensity for better reflections
        renderer.render(scene, camera);
    })

}

function addWizards() {
    stats = setupStats();
    helper = new Helper(scene, camera, renderer, orbitControl);
    customizer = new Customizer(scene);
    constantUniformCustomizer = new ConstantUniformsCustomizer(scene)
}
function init() {
    assignPresets()
    
    setGlobalConfigs()
    // addLights(scene); // Add the new lights
    enableBloom(scene)
    world = new RAPIERWORLD(scene, false)
    // raycaster = new Raycaster(scene, camera, renderer)
    // loadedModel = new Model(scene, camera, renderer); //cost 17fps (43)
    // productBalls = addProductBalls(scene)
    bubble = new Bubbles(scene)
    intro = new Intro(scene)
    console.log(intro)
    // setupReflection(intro.floor)
    // addCube()


    // test()


    addWizards()
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    // if (renderer && scene && camera) renderer.render(scene, camera);
    if (composer) composer.render();
    if (stats) stats.update();
    // if (helper && helper.liveTracking) helper.update()
    // if (loadedModel) loadedModel.update(delta);
    // if (raycaster && scene.isAdjusted) raycaster.update()
    if (world) world.update(delta)
    if (bubble) bubble.update(delta)
    if (intro ) {
        // intro.floor.material.update()
        intro.update(delta)
    }
    if (scene && scene.constantUniform) scene.constantUniform.iTime.value += delta
}

init();
animate();

/**
 * NEW FUNCTION: Adds a red cube to the scene.
 */
function addCube() {
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    // The bloom effect will pick up any material with emissive properties
    const material = new THREE.MeshStandardMaterial({ 
        color: 'red',
        emissive: 'red', // The color of the glow
        emissiveIntensity: 21.5 // The strength of the glow
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(1, 7, 5);
    scene.add(cube);

    // bloomEffect.selection.add(cube);
}


/**
 * REVERTED: Sets up a simple, regular bloom effect for the entire scene.
 */







