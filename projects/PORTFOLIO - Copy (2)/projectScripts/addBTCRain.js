import * as THREE from 'three';
import { BasicGeometries } from '../configs/setupGeometries.js'; // Basic geometries for the scene
import * as CONSTANTS from './constant.js';
// import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import RAPIER from './rapier3d-compat.js';
import { bindBodyObject } from './addRapierWorld.js';

const goldInnerGlowMat = CONSTANTS.createInnerGlowMat("#FBC189", 1., 1);
const goldOuterGlowMat = CONSTANTS.createOuterGlowMat("#FBC189",  0.95, 0.03, 6.5)
// const goldInnerGlowMatSkinned = CONSTANTS.createInnerGlowMatSkinned("#dcd0ba", 1., 1) //for skinned mesh to maintain animation

function getRandomFloat(min, max) {
  return Math.random() * (max - min) + min;
}
export function addBTCRainX(scene, amount= 1000){
    const world = scene.world
    let radius = 0.09, height = 0.008
    let c = scene.getObjectByName('btc')
    c.material.toneMapped = false
    c.material.envMap = scene
        
        const cylinderShape = RAPIER.ColliderDesc.cylinder(height/2, radius).setMass(0.1).setRestitution(0.8)
    for (let i = 0; i <= amount; i++){
        let mesh = c.clone()
        mesh.name = 'btcClone'
        mesh.position.z = getRandomFloat(-20, 20)
        mesh.position.y = getRandomFloat(8, 15)
        mesh.position.x = getRandomFloat(-6, 3)
        mesh.rotation.x = getRandomFloat(-Math.PI, Math.PI)
        mesh.rotation.y = getRandomFloat(-Math.PI, Math.PI)
        mesh.rotation.z = getRandomFloat(-Math.PI, Math.PI)
        
        mesh.castShadow = true

        const cylinderBody = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setCanSleep(true))
        bindBodyObject(scene, mesh, cylinderBody, cylinderShape)
    }
   
}

export function addBTCRain(scene, amount = 1) {
    const world = scene.world;
    if (!world) {
        console.error("Scene is missing a 'world' property for the Rapier physics world.");
        return;
    }

    // --- 1. Setup Template Mesh and Material ---
    const templateMesh = scene.getObjectByName('btc');
    if (!templateMesh) {
        console.error("Object with name 'btc' not found in the scene.");
        return;
    }

    templateMesh.material.toneMapped = false;
    templateMesh.material.envMap = scene.environment; // Use scene.environment for env maps

    // --- 2. Create InstancedMesh for Rendering ---
    // Use the template's geometry and material to create one InstancedMesh for all coins.
    const instancedMesh = new THREE.InstancedMesh(templateMesh.geometry, templateMesh.material, amount);
    instancedMesh.castShadow = true;
    instancedMesh.name = 'btcRain';
    scene.add(instancedMesh);

    // --- 3. Setup Physics ---
    const radius = 0.09, height = 0.008;
    const cylinderShape = RAPIER.ColliderDesc.cylinder(height / 2, radius)
        .setMass(0.1)
        .setRestitution(0.8);

    const rigidBodies = [];
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3(3, 3, 3);

    // --- 4. Create each instance's physics body and set initial state ---
    for (let i = 0; i < amount; i++) {
        // Set a random initial transform
        position.set(
            getRandomFloat(-3, 0),
            getRandomFloat(8, 8.2),
            getRandomFloat(-2, 2)
        );
        quaternion.setFromEuler(
            new THREE.Euler(
                getRandomFloat(-Math.PI, Math.PI),
                getRandomFloat(-Math.PI, Math.PI),
                getRandomFloat(-Math.PI, Math.PI)
            )
        );

        // A. Create the Rapier rigid body with the initial transform
        const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(position.x, position.y, position.z)
            .setRotation(quaternion)
            .setCanSleep(true);
        const body = world.createRigidBody(bodyDesc);
        world.createCollider(cylinderShape, body);
        rigidBodies.push(body);

        // B. Set the initial matrix for the visible instance
        matrix.compose(position, quaternion, scale);
        instancedMesh.setMatrixAt(i, matrix);
    }
    // Tell the InstancedMesh to update its matrices
    instancedMesh.instanceMatrix.needsUpdate = true;


    // --- 5. Add update logic to the animation loop ---
    // This function will run every frame, right before rendering.
    const updateFunction = () => {
        for (let i = 0; i < rigidBodies.length; i++) {
            const body = rigidBodies[i];
            
            // Get the transform from the physics body
            position.copy(body.translation());
            quaternion.copy(body.rotation());

            // Apply it to the instance's matrix
            matrix.compose(position, quaternion, scale);
            instancedMesh.setMatrixAt(i, matrix);
        }
        // Mark the matrix as needing an update
        instancedMesh.instanceMatrix.needsUpdate = true;
    };
    
    // Attach the update logic to the scene's render cycle
    scene.userData.updateFunctions = scene.userData.updateFunctions || [];
    scene.userData.updateFunctions.push(updateFunction);

    // You would then call scene.userData.updateFunctions.forEach(fn => fn()) in your main animate loop.
    // A simpler, three.js-native way is to use onBeforeRender:
    scene.onBeforeRender = updateFunction;
}