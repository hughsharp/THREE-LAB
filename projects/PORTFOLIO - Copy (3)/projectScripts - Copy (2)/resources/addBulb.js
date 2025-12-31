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


function createBulb(scene) {
    // const bulbMat = CONSTANTS.createInnerGlow(undefined, { oscillating: true, oscillationStrength: 1.0, isOscillating: 1.0 })
    const bulbMat = CONSTANTS.createInnerGlow(undefined, { morphing: true, oscillating: true, oscillationStrength: 1.0, isOscillating: 0.0 });
    let btcSymbol = scene.getObjectByName("btc_symbol");
    let bulbSample = scene.getObjectByName("bulbSample"); // no UV

    const bulbGeo = new MorphGeo([BasicGeometries.sphere, btcSymbol.geometry, bulbSample.geometry]);
    const bulb = new THREE.Mesh(bulbGeo, bulbMat);

    linkConstantUniforms(bulbMat, ['iTime', 'uTransformProgress', 'uIsOscillating', 'uOscillationStrength']);
    scene.add(bulb);
    bulbGeo.setMorphInfo(1, 2);

    // bulb.position.set(-2, 9.20, -0.30);
    bulb.position.set(-9.20, 9.6, -0.39); //x:-9.20, y:7.25, z:-0.39
    bulb.scale.setScalar(0);
    bulb.name = "bulb";

    let bulbAura = new THREE.Mesh(bulb.geometry, CONSTANTS.createOuterGlow(undefined, { oscillating: true, oscillationStrength: 1.0, isOscillating: 1.0 }));
    // let bulbAura = bulb.clone()
    bulbAura.material = CONSTANTS.createOuterGlow(undefined, { oscillating: true, oscillationStrength: 1.0, isOscillating: 1.0 });
    linkConstantUniforms(bulbAura.material, ['iTime', 'uOscillationStrength', 'uIsOscillating']);
    bulbAura.scale.setScalar(1.5);
    bulbAura.name = "bulbAura";
    // bulb.add(bulbAura);


    // LIGHT
    const bulbColor = new THREE.Color(0xffe0b2);
    const bulbIntensity = 0;
    const bulbDistance = 0;
    const bulbLight = new THREE.PointLight(bulbColor, bulbIntensity, bulbDistance);
    bulbLight.name = "bulbLight";
    // bulbLight.position.set(-2, 9.20, -0.30);
    // scene.add(bulbLight);
    bulb.add(bulbLight);
    bulbLight.castShadow = true;

    scene.bulb = bulb;
    scene.bulbLight = bulbLight;
    return bulb
}