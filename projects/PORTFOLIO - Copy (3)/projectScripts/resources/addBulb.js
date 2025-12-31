import * as THREE from 'three';
import * as CONSTANTS from '../utils/constant.js';
import { linkConstantUniforms } from '../utils/addConstantUniform.js';
import { BasicGeometries } from '../../configs/setupGeometries.js';
//import from constant.js

import { bulb } from '../utils/base64Strings.js';

import { MorphGeo } from '../utils/MorphGeo.js';

export function addBulb(scene) {
    let bulb = createBulb(scene)

    // let btcSymbol = scene.getObjectByName("btc_symbol");
    // let bulbSample = scene.getObjectByName("bulbSample");
    // bulb.userData.morphTargets = []

    // const count0 = bulb.geometry.attributes.position.count;
    // const count1 = bulbSample.geometry.attributes.position.count;
    // const count2 = btcSymbol.geometry.attributes.position.count;
    // const maxCount = Math.max(count0, count1, count2);
    // console.log(`Morph Debug: Bulb Count: ${count0}, Sample Count: ${count1}, BTC Count: ${count2}, Max: ${maxCount}`);

    // // Create Unified Geometry using MorphGeo class
    // // Constructor: new MorphGeo(baseGeo, targetGeos)
    // const morphGeo = new MorphGeo([bulb.geometry, btcSymbol.geometry]);

    // // Apply New Geometry to Bulb
    // bulb.geometry.dispose();
    // bulb.geometry = morphGeo;

    // // Persist indices for the tween animation (test.js)
    // bulb.userData.originalIndex = morphGeo.userData.originalIndex;
    // bulb.userData.targetIndex = morphGeo.userData.targetIndex;

    // bulb.material = CONSTANTS.goldMorphOscillatingMat;
    // linkConstantUniforms(bulb.material, ['iTime', 'uTransformProgress', 'uIsOscillating', 'uOscillationStrength']);


}

// Plan


// function createBulb(scene) {
//     // const bulbMat = CONSTANTS.goldOscillatingMat
//     /*
//     const bulbMat = CONSTANTS.goldMorphOscillatingMat;
//     linkConstantUniforms(bulbMat, ['iTime', 'uTransformProgress', 'uIsOscillating', 'uOscillationStrength']);

//     let btcSymbol = scene.getObjectByName("btc_symbol");
//     let bulbSample = scene.getObjectByName("bulbSample"); // no UV
//     let sphereSample = scene.getObjectByName("sphereSample");

//     const bulbGeo = new MorphGeo([BasicGeometries.sphere, btcSymbol.geometry, bulbSample.geometry]);
//     // const bulbGeo = new MorphGeo([sphereSample.geometry, btcSymbol.geometry, bulbSample.geometry]);
//     bulbGeo.setMorphInfo(0, 1); // Revert to failing case for test

//     const bulb = new THREE.Mesh(bulbGeo, bulbMat);
//     scene.add(bulb);


//     // bulb.position.set(-2, 9.20, -0.30);
//     bulb.position.set(-9.20, 9.6, -0.39); //x:-9.20, y:7.25, z:-0.39
//     bulb.scale.setScalar(0);
//     bulb.name = "bulb";
//     */
//     // ...
// }

function createBulb(scene) {
    const bulbMat = CONSTANTS.goldMorphOscillatingMat;
    linkConstantUniforms(bulbMat, ['iTime', 'uTransformProgress', 'uIsOscillating', 'uOscillationStrength']);

    let btcSymbol = scene.getObjectByName("btc_symbol");
    let bulbSample = scene.getObjectByName("bulbSample"); // no UV
    let sphereSample = scene.getObjectByName("sphereSample");

    // Revert to using MorphGeo Class explicitly
    const bulbGeo = new MorphGeo([BasicGeometries.sphere, btcSymbol.geometry, bulbSample.geometry]);
    bulbGeo.setMorphInfo(0, 1);

    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    scene.add(bulb);

    bulb.position.set(-9.20, 9.6, -0.39);
    bulb.scale.setScalar(0);
    bulb.name = "bulb";

    let bulbAura = new THREE.Mesh(bulb.geometry, CONSTANTS.goldMorphOscillatingOuterGlowMat);
    linkConstantUniforms(bulbAura.material, ['iTime', 'uOscillationStrength', 'uIsOscillating', 'uTransformProgress']);
    bulbAura.scale.setScalar(2);
    bulbAura.name = "bulbAura";
    bulb.add(bulbAura);

    // Light
    const bulbColor = new THREE.Color(0xffe0b2);
    const bulbIntensity = 0;
    const bulbDistance = 10;
    const bulbLight = new THREE.PointLight(bulbColor, bulbIntensity, bulbDistance);
    bulbLight.name = "bulbLight";
    bulb.add(bulbLight);
    bulbLight.castShadow = true;
    bulbLight.shadow.mapSize.width = 256;
    bulbLight.shadow.mapSize.height = 256;
    bulbLight.shadow.bias = -0.0005; // Helps with low-res artifacts

    scene.bulb = bulb;
    scene.bulbLight = bulbLight;
    return bulb
}