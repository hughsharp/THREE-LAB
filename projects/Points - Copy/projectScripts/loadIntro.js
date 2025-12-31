import * as THREE from 'three';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';
import { gltfLoader,textureLoader,rgbeLoader } from '../configs/setupLoaders.js';
import { BasicGeometries } from '../configs/setupGeometries.js';
import { constantUniform} from './addConstantUniform.js';
import { adjustWalls } from './adjustWalls.js';
import { addLights} from './addLights.js';
import * as CONSTANTS from './constant.js'
import { addFireflies } from './addFireflies.js';
import { VanishEffect } from './vanishEffect.js';
import { addDragonBalls } from './addDragonBalls.js';
import * as ARAP from './addRapierWorld.js';
import {loadedModelRaycast} from './loadedModelRaycast.js';
import { addBTCRain } from './addBTCRain.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
// import  FakeGlowMaterial  from 'three/addons/materials/FakeGlowMaterial.js';

			// import { pass, mrt, output, emissive } from 'three/tsl';
			// import { bloom } from 'three/addons/tsl/display/BloomNode.js';
            // let postProcessing;
let portalTexture = textureLoader.load('./textures/noise.png');
// const dracoLoader = new DRACOLoader()


const GLB = 'sketch--nomat-decimated.glb'
const goldOuterGlowMat = CONSTANTS.createOuterGlowMat("#dcd0ba", 0.85, 0.03, 6.5) //#dcd0ba
const goldInnerGlowMat = CONSTANTS.createInnerGlowMat("#dcd0ba", 1., 1)
const frontGateSMat = new THREE.ShaderMaterial({
    vertexShader: CONSTANTS.vertexShader,
    fragmentShader: CONSTANTS.cosmicPortalFragmentShader, //nebulaHelixFS, supernovaFS
    transparent:true,
    uniforms: constantUniform,
    // blending :THREE.AdditiveBlending,
    toneMapped: false
    // side: THREE.DoubleSide
})

const glowShaderMat = new THREE.ShaderMaterial({
    vertexShader: CONSTANTS.vertexShader,
    fragmentShader: CONSTANTS.redGlowFragmentShader, //nebulaHelixFS, supernovaFS
    transparent:true,
    uniforms: constantUniform,
    // blending :THREE.AdditiveBlending,
    toneMapped: false
    // side: THREE.DoubleSide
})
function adjustTheme(scene){
    scene.environmentIntensity = 1
    scene.backgroundColor = new THREE.Color('black')
    let renderer = scene.renderer
    renderer.toneMappingExposure = 1
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.outputEncoding = THREE.sRGBEncoding
    console.log(renderer)
}
/**
 * --- NEW FUNCTION ---
 * Creates and adds a white, shadow-receiving floor to the scene.
 * @param {THREE.Scene} scene The scene to add the floor to.
 */
function addFloor(scene) {
    // Define the shape and size of the floor
    const floorGeometry = new THREE.PlaneGeometry(256, 256);

    // Create a white material that can receive shadows
    // const floorMaterial = new THREE.MeshStandardMaterial({
    //     color: 0xffffff,
    // });

    // Combine the geometry and material into a mesh
    let floor = new THREE.Mesh(floorGeometry);

    // Rotate the plane to be horizontal
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.03;


    // Enable the floor to receive shadows
    floor.receiveShadow = true;
    
    // Give it a name for easier debugging
    floor.name = 'floor';

    // Add the floor to the scene
    scene.add(floor);
    return floor
}

function adjustObjects(scene){
    function assignMaterial(name, material){
        let obj = scene.getObjectByName(name)
        if (obj.isMesh) obj.material = material
    }
    let obj = scene.getObjectByName("Plane")
    let p = new THREE.Mesh(BasicGeometries.plane, frontGateSMat)
    p.rotation.x = -Math.PI/2
    obj.add(p)
    scene.attach(p)
    p.scale.setScalar(3.6)
    obj.visible = false
    p.name = 'tp'


    // let t = scene.getObjectByName('Table_Table_0.003')
    // let m = t.material
    // m.emissive.copy(m.color)
    // m.emissiveIntensity = 10

 
    // scene.constantUniform.portalTexture = {value: portalTexture}
}
function addTweenData(item, scene){
    const itemData = {
        uuid: item.uuid,
        name: item.name,
        position: item.position.clone(),
        rotation: {
            x: item.rotation.x,
            y: item.rotation.y,
            z: item.rotation.z,
            order: item.rotation.order,
        },
        scale: item.scale.clone(),
        parent: item.parent
    };
    scene.tweenData = scene.tweenData || [];
    scene.tweenData.push(itemData);
}

export class Intro {
    constructor(scene) {

        adjustTheme(scene)

        let loadedModel = this;

        // --- MODIFIED: Add the floor to the scene ---
        // let floor = addFloor(scene);

        // this.floor = floor
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath( '../../examples/jsm/libs/draco/' );
		dracoLoader.setDecoderConfig( { type: 'js' } );
gltfLoader.setDRACOLoader( dracoLoader );
        gltfLoader.setPath('./models/');
        gltfLoader.load(GLB, async function (gltf) {
            const model = gltf.scene;
            let renderer = scene.renderer
            let camera = scene.camera


            model.name = 'intro'
            await renderer.compileAsync(model, camera, scene);
            scene.add(model);
            model.scale.setScalar(4)
            renderer.render(scene, camera);
            const redMat = new THREE.MeshStandardMaterial({
                color: 'red',
                emissive: 'red', // The color of the glow
                emissiveIntensity: 21.5 // The strength of the glow
            })
            function applyMaterial(child, name,mat){
                if (child.name === name){
                    child.material = mat
                } 
            }
            
            model.traverse((child) => {
                if (child.isMesh && child.material.isMeshStandardMaterial) {
                    child.material.metalness = 0.0;
                    child.material.roughness = .0;
                    child.castShadow = true;
                }

                if (child.isMesh || child.getObjectByProperty('isSkinnedMesh', true)){
                    addTweenData(child, scene)
                }

                applyMaterial(child, 'Sphere_0', redMat)
                // if (child.name ===  'Object_705'){
                //     // child.material = fakeGlowMaterial
                //     let m = child.material
                //     m.emissive = new THREE.Color('yellow')
                //     m.color = new THREE.Color('yellow')
                //     m.emissiveIntensity = 10
                //     console.log(child)
                // }

                // if (child.name === 'object012'){
                //     child.material.emissive = child.material.color
                //     child.material.emissiveIntensity = 10
                //     console.log(child)
                // }
                // if (child.name === 'star'){ 
                //     child.material.emissive = child.material.color
                //     child.material.emissiveIntensity = 1
                //     console.log(child)
                // }
                // if (child.name === 'object015'){
                //     child.material.emissive = child.material.color
                //     child.material.emissiveIntensity = 10
                //     console.log(child)
                // }
                
            });             
            console.log("Collected items from model:", scene.tweenItems);
            const mixer = new THREE.AnimationMixer(model);
            gltf.animations.forEach((clip) => {
                const action = mixer.clipAction(clip);
                action.play();
            });
            console.log(gltf.animations)
            loadedModel.model = model;
            loadedModel.mixer = mixer;

            // adjustObjects(scene)
 
        });
    }
    
    update(delta){
        TWEEN.update();
        // this.floor.material.update()
        if (this.constantUniform) {
            this.constantUniform.iTime.value += delta
        }
        if (this.mixer) this.mixer.update(delta)
    }
}