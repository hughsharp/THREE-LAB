import * as THREE from 'three';
import * as CONSTANTS from './constant.js';
import { fetchTopProducts } from './fetchProducts.js';
import { BasicGeometries } from '../configs/setupGeometries.js'; // Basic geometries for the scene
import { constantUniform} from './addConstantUniform.js';
import { textureLoader } from '../configs/setupLoaders.js';

import RAPIER from './rapier3d-compat.js';
import { bindBodyObject } from './addRapierWorld.js';
// let refractSphereCamera
let geo = BasicGeometries.sphere

const products = await fetchTopProducts();
const SCENE_LAYER = 0;
const BUBBLE_LAYER = 1;

const bgShaderMat = new THREE.ShaderMaterial({
    vertexShader: CONSTANTS.vertexShader,
    fragmentShader: CONSTANTS.underwaterPlanetFS,
    transparent:true,
    uniforms: constantUniform,
    // blending :THREE.AdditiveBlending,
    side: THREE.FrontSide

})
const cubeRenderTarget = new THREE.WebGLCubeRenderTarget( 512 );
let refractSphereCamera = new THREE.CubeCamera( 0.1, 5000, cubeRenderTarget );

    
var fresnelUniforms = {
    "uOpacity": { value: 0.25 },   
    "mRefractionRatio": { value: 1.02 },
    "mFresnelBias": 	{ value: 0.1 },
    "mFresnelPower": 	{ value: 2.0 },
    "mFresnelScale": 	{value: 1.0 },
    "tCube": 			{  value: refractSphereCamera.renderTarget.texture } //  textureCube }
}

var customMaterial = new THREE.ShaderMaterial({
    uniforms: 		fresnelUniforms,
    vertexShader:   CONSTANTS.fresnelVertexShader,
    fragmentShader: CONSTANTS.fresnelFragmentShader,
    side: THREE.BackSide,
    transparent: true
});

export class Bubbles {
    constructor(scene) {
            this.scene = scene
            this.refractSphereCamera = refractSphereCamera
            // this.refractSphereCamera.layers.set(SCENE_LAYER);
            scene.add( refractSphereCamera );
            scene.camera.layers.enableAll();
            addBubbleBg(scene)

            let totalVotes = 0
            let baseRadius = 50
            products.forEach( (product) => {
                totalVotes += product.votesCount
            })
            
            products.forEach( (product) => {
                let i = products.indexOf(product)
                if (i >10)return
                let ratio = product.votesCount / totalVotes
                let radius = baseRadius * ratio
                let bubble = createBubble(scene, radius, product.thumbnail)
                bubble.name = 'b1'
                // scene.add(bubble)
                console.log(refractSphereCamera)
                bubble.position.set(i, i*2, i)
                refractSphereCamera.position.copy(bubble.position)
                console.log(radius)
            })

        this.constantUniform = constantUniform
        
        }

        update(delta){
           
            this.refractSphereCamera.update( this.scene.renderer, this.scene );
            if (this.constantUniform) {
                this.constantUniform.iTime.value += delta
            }
        }
}


function addBubbleBg(scene){
                let bgMesh = new THREE.Mesh(BasicGeometries.plane, new THREE.MeshBasicMaterial({
                color: 'white', 
                toneMapped: false, 
                // depthTest:false,
                // depthWrite:false
             })   )
            scene.add(bgMesh)
            bgMesh.rotation.y = Math.PI/2
            bgMesh.position.z = -1
            bgMesh.scale.setScalar(200)
            bgMesh.name = 'bg'
            scene.camera.attach(bgMesh)
            bgMesh.position.set(0,0,-100)
}


    // let m2 = new THREE.Mesh(geo, mat )
    // m2.scale.setScalar(0.4)
    // mesh.add(m2)
function createBubble(scene,radius, imgUrl){
    let bubbleMesh = new THREE.Mesh(geo, customMaterial)
    scene.add(bubbleMesh)
    bubbleMesh.scale.setScalar(radius)
    bubbleMesh.layers.set(BUBBLE_LAYER); 
    
            // mesh.add(auraMesh)
            // 2. Create a sprite material and the sprite
            
    textureLoader.load(imgUrl, function (texture){
        // const spriteMat = new THREE.SpriteMaterial({ map: texture, toneMapped:false });
        // const sprite = new THREE.Sprite(spriteMat);
        
        // sprite.scale.set(0.5, 0.5, 0.5); // Adjust scale as needed
        // bubbleMesh.add(sprite);
        let coreMat = new THREE.MeshBasicMaterial({
            map : texture, 
            toneMapped: false,
            side: THREE.DoubleSide
        })
        let coreMesh = new THREE.Mesh(circle, coreMat)
        coreMesh.scale.setScalar(0.5)
        bubbleMesh.add(coreMesh)
        console.log(coreMesh)
    })
    
    const body = scene.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(bubbleMesh.position.x, bubbleMesh.position.y, bubbleMesh.position.z)
            .setCanSleep(true)
    );
    scene.world.productBodies = scene.world.productBodies || []
    scene.world.productBodies.push(body)
    
    const shape = RAPIER.ColliderDesc.ball(radius/2    )
    .setRestitution(.04) // Low bounciness for a glass-like feel. 0 is no bounce, 1 is a perfect bounce.
    .setMass(getRandomFloat(1,5)) //getRandomFloat(1,5)
    bubbleMesh.rapierBody = body
    bubbleMesh.rapierShape = shape
    body.threeMesh = bubbleMesh
    body.rapierShape = shape
    bindBodyObject(scene, bubbleMesh, bubbleMesh.rapierBody, bubbleMesh.rapierShape)


    return bubbleMesh
}
function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}