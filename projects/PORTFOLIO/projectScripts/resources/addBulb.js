import * as THREE from 'three';
import * as CONSTANTS from '../utils/constant.js';
import { linkConstantUniforms } from '../utils/addConstantUniform.js';
import { BasicGeometries } from '../../configs/setupGeometries.js';
//import from constant.js

import { bulb } from '../utils/base64Strings.js';

import { MorphGeo } from '../utils/MorphGeo.js';

export function addBulb(scene) {
    let bulb = createBulb(scene)


}



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