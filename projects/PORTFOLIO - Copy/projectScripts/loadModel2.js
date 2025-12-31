import * as THREE from 'three';
import { gltfLoader,textureLoader,rgbeLoader } from '../configs/setupLoaders.js'; // Import the texture loader
import { BasicGeometries } from '../configs/setupGeometries.js'; // Basic geometries for the scene
import { adjustWalls } from './adjustWalls.js'; // Function to add the floor to the scene
import {addLights} from './addLights.js';
import * as CONSTANTS from './constant.js'
import { addFireflies } from './addFireflies.js';


const blankTexture = textureLoader.load('./textures/blank2.png');
const fireFliesTexture = textureLoader.load('./textures/spark1.png')
let constantUniform =     {
        iTime: { value: 0.1 },
        iResolution: {value: new THREE.Vector2(window.screen.width * window.devicePixelRatio,window.screen.height * window.devicePixelRatio ) },
        s: {value:0.95},
        b: {value:0.03},
        p: { value: 1.0 },
        glowColor: {value: new THREE.Color("red")},
        scaleFactor : {value:1.7},
        iChannelX: { value: blankTexture },
        moonLightYs: {value: new THREE.Vector2(0.0, 0.1)},
        alpha: {value:1.0},
        nebulaCoreRadius: {value: 80.0}, // Adjust this value to control the core radius of the nebula
        isStriking: {value: false},
        strikePosX: {value: 0.5},
        fireFliesTexture: { value: fireFliesTexture },
    }

const wallShaderMat = new THREE.ShaderMaterial({
    vertexShader: CONSTANTS.vertexShader,
    fragmentShader: CONSTANTS.nebulaHelixFS, //nebulaHelixFS, supernovaFS
    transparent:true,
    uniforms: constantUniform,
    blending :THREE.AdditiveBlending,
    // side: THREE.DoubleSide
})


function createOuterGlowMat(color, s, b, p, side = THREE.FrontSide) {

    let glowMat = new THREE.ShaderMaterial({
        uniforms: {
            "s": { type: "f", value: s }, //glow strength

            "b": { type: "f", value: b }, //outer border
            "p": { type: "f", value: p },
            glowColor: { type: "c", value: new THREE.Color(color) }
        },
        vertexShader: CONSTANTS.vertexShaderGlow,
        fragmentShader: CONSTANTS.fragmentShaderOuterGlow,
        side: side,
        blending: THREE.AdditiveBlending,
        transparent: true,
        // fog: false,
        // wireframe:true
    });
    return glowMat
}
function createInnerGlowMat(glowColor,glowPower, glowIntensity){
    return new THREE.ShaderMaterial({
        uniforms: {
            glowColor: { value: new THREE.Color(glowColor) },
            glowPower: { value: glowPower },
            glowIntensity: { value: glowIntensity }
        },
        vertexShader: CONSTANTS.vertexShaderGlow,
        fragmentShader: CONSTANTS.fragmentShaderInnerGlow,
        side: THREE.FrontSide,
        blending: THREE.AdditiveBlending,
        transparent: true
    });
}

const goldOuterGlowMat = createOuterGlowMat("#dcd0ba", 0.85, 0.03, 6.5) //#dcd0ba
const goldInnerGlowMat = createInnerGlowMat("#dcd0ba", 1., 1)

function adjustBlackhole(scene){
        let blackhole = scene.getObjectByName("Blackhole")
        blackhole.traverse((child) => {
            if (child.isMesh && child.material) {
                child.material.roughness = 0.95
                child.material.metalness = 0
                child.material.side = THREE.FrontSide
                child.material.blending = THREE.AdditiveBlending
                child.castShadow = false
                // child.material.envMap = scene.environment
                child.material.needsUpdate = true;
                // child.visible = false
            }
        })

        // let obj = scene.getObjectByName("Lathe_L")

        let planeWall = new THREE.Mesh(
            BasicGeometries.plane,// new THREE.PlaneBufferGeometry(4,3),
            wallShaderMat
            )
        scene.add(planeWall)
        planeWall.scale.set(8,8,1)
        planeWall.rotation.set(0, Math.PI/2, 0)
        planeWall.position.set(-5.5, 7.2, -0.3)
        planeWall.name = "planeWall"
}

function adjustObjects(scene) {
    rgbeLoader.load('textures/' + 'peppermint_powerplant_2_1k' + '.hdr', function (texture) {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            // scene.environment = texture;
            // renderer.render(scene, camera);
            let screenBorder = scene.getObjectByName("screenBorder")
            screenBorder.material.envMap = texture;
            screenBorder.material.needsUpdate = true;
            screenBorder.material.side = THREE.FrontSide;
            screenBorder.material.envMapIntensity = 15;
            screenBorder.material.metalness = 0.1;
            screenBorder.material.roughness = 0.5;
            screenBorder.material.envMapRotation.set(0, 0.5, 0.5);

            //Chair
            let chair = scene.getObjectByName("Object_0006_3")
            chair.material.envMap = texture;
            chair.material.needsUpdate = true;
            chair.material.side = THREE.FrontSide;
            chair.material.envMapIntensity = 1;
            chair.material.metalness = 0;
            chair.material.roughness = 0.32
            chair.material.envMapRotation.set(0, Math.PI/2, 0);

            //PC Case
            let pcCase = scene.getObjectByName("Object_0005")
            pcCase.material.envMap = texture;
            pcCase.material.needsUpdate = true;
            pcCase.material.side = THREE.FrontSide;
            pcCase.material.envMapIntensity = 3;
            pcCase.material.metalness = 0;
            pcCase.material.roughness = 0.1
            // pcCase.material.envMapRotation.set(0, Math.PI/2, 0);

            //shelf
            let shelf = scene.getObjectByName("shelfbody")
            shelf.material.envMap = texture;
            shelf.material.needsUpdate = true;
            shelf.material.side = THREE.FrontSide;
            shelf.material.envMapIntensity = 0.65;
            shelf.material.metalness = 0.5;
            shelf.material.roughness = 0.1
            //black
            let cat = scene.getObjectByName("Object_12001")
            cat.material.envMap = texture;
            cat.material.needsUpdate = true;
            cat.material.side = THREE.FrontSide;
            cat.material.envMapIntensity = 2.2;


    })
}

function addMoon(scene){
    textureLoader.load("./textures/moonMed.jpg", function(texture) {
        let moon = new THREE.Mesh(
            BasicGeometries.sphere, // new THREE.SphereGeometry(15, 32, 32),
            new THREE.MeshBasicMaterial({ map: texture })
        )
        moon.name = "moon"
        scene.add(moon)
        moon.position.set(-420.00, 120.00, 205.00)
        moon.scale.setScalar(25)
        // moon.rotation.y = -halfPI
    
        let moonInnerGlow = new THREE.Mesh(
            BasicGeometries.sphere, // new THREE.SphereGeometry(15, 32, 32),
            goldInnerGlowMat
        )
        moonInnerGlow.scale.setScalar(1.01)
        moonInnerGlow.name = "moonInnerGlow"
        moon.add(moonInnerGlow)
        
    
        let moonOuterGlow = new THREE.Mesh(
            BasicGeometries.sphere, // new THREE.SphereGeometry(15, 32, 32),
            goldOuterGlowMat
        )
        moonOuterGlow.scale.setScalar(2.5)
        moonOuterGlow.name = "moonOuterGlow"
        moon.add(moonOuterGlow)
    })
}
function addSky(scene) {
    const skyShaderMat = new THREE.ShaderMaterial({
        vertexShader: CONSTANTS.vertexShader,
        fragmentShader: CONSTANTS.stormFS,
        transparent:true,
        uniforms: constantUniform,
        blending :THREE.AdditiveBlending,
        side: THREE.BackSide
    })
    
    let planeSky = new THREE.Mesh(
        BasicGeometries.plane, // new THREE.PlaneBufferGeometry(1000, 1000),
        skyShaderMat
        )
    
    scene.add(planeSky)
    planeSky.position.set(-55.00, -20.00, 30.00)
    planeSky.scale.setScalar(150)
    planeSky.name = "planeSky"
}

function adjustRainyGlass(scene) {
    const rainyGlassShaderMat = new THREE.ShaderMaterial({
        vertexShader: CONSTANTS.vertexShader,
        fragmentShader: CONSTANTS.rainyGlassFS,
        transparent:true,
        uniforms: constantUniform,
        blending :THREE.AdditiveBlending,
        side: THREE.FrontSide
    })
    // let geo = BasicGeometries.plane
    //     let mesh = new THREE.Mesh(geo, rainyGlassShaderMat)
    // scene.add(mesh)
    // mesh.name = 'glassR'
    // mesh.position.set(4.00, 3.00, 0.00)
    let glass = scene.getObjectByName("glass1")
    glass.material = rainyGlassShaderMat
}





export class Model {
            constructor(scene, camera, renderer) {
                let loadedModel = this;
                gltfLoader.setPath('./models/');
                gltfLoader.load('MessyRoom24.glb', async function (gltf) { //13,14 good 15 no backWall, 16 (14+higher window), 17 (16+ceiling)
                    const model = gltf.scene;
                    await renderer.compileAsync(model, camera, scene);
                    scene.add(model);
                    renderer.render(scene, camera);
                    
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.material.side = THREE.FrontSide;
                            // child.material.blending = THREE.NoBlending;
                            // child.material.transparent = false
                            child.castShadow = true;
                        
                            child.material.needsUpdate = true;
                        }
                    })

                    const mixer = new THREE.AnimationMixer(model);
                    gltf.animations.forEach((clip) => {
                        const action = mixer.clipAction(clip);
                        action.play();
                    });
                    adjustWalls(scene);
                    adjustBlackhole(scene)
                    adjustObjects(scene);
                    addMoon(scene)
                    addSky(scene);
                    adjustRainyGlass(scene)

                    addLights(scene, constantUniform) //lights and thunders
                    addFireflies(scene, constantUniform)
                    // fireflies.position.y = 7
                    // fireflies.position.copy(-4.50, 7.25, -0.39)
                    // addFogBox(scene)
                    addBulb(scene)



                    //Important assinments 
                    loadedModel.model = model;
                    loadedModel.mixer = mixer;
                    loadedModel.constantUniform = constantUniform;

                });
                
                

            }
            update(delta){
                if (this.constantUniform) {
                    this.constantUniform.iTime.value += delta
                   this.constantUniform.nebulaCoreRadius.value = 31 + 29 * Math.sin(this.constantUniform.iTime.value * 0.4);
// this.constantUniform.nebulaCoreRadius.value = 2 + (60 - 2) * (3 * Math.pow(0.5 + 0.5 * Math.sin(this.constantUniform.iTime.value * 0.4), 2) - 2 * Math.pow(0.5 + 0.5 * Math.sin(this.constantUniform.iTime.value * 0.4), 3));
                }
                if (this.mixer) this.mixer.update(delta)
            }

        }



    function addBulb(scene){
        const bulbColor = new THREE.Color(0xffe0b2); // A warm, soft orange-yellow
        const bulbIntensity = 800;
        const bulbDistance = 25; // How far the light reaches
        const bulbLight = new THREE.PointLight(bulbColor, bulbIntensity, bulbDistance);
        bulbLight.name = "bulbLight";
        bulbLight.position.set(-2, 7.20, -0.30); // Example position, adjust as needed for your scene
        scene.add(bulbLight);  
        bulbLight.castShadow = true 
    }

