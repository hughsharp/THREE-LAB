import * as THREE from 'three';
import { textureLoader,rgbeLoader } from '../configs/setupLoaders.js'; // Import the texture loader
import { BasicGeometries } from '../configs/setupGeometries.js'; // Basic geometries for the scene

const geo = BasicGeometries.plane; // Use the plane geometry from BasicGeometries
const wallMat = new THREE.MeshStandardMaterial({
    roughness: 0.90,
    color: 0x0a1633,//0x0a1633, // dark navy color
    metalness: 0.25,
    side: THREE.FrontSide,
    name: 'wallMat',
    // envMapRotation: 0.1,
    // bumpScale: 0.0005
});
const backWallMat = new THREE.MeshStandardMaterial({
    roughness: 0.90,
    color: "#090919",//0x0a1633, // dark navy color
    metalness: 0.25,
    side: THREE.FrontSide,
    name: 'backWallMat',
    // envMapRotation: 0.1,
    // bumpScale: 0.0005
});


wallMat.envMapRotation.y = 1.4
let basicMat = new THREE.MeshBasicMaterial({
    color: 0x0a1633, // dark navy color
})

export function addFloor() {
    // const floorGeometry = new THREE.PlaneGeometry(17.5, 33);
    const floorMat = new THREE.MeshStandardMaterial({
        roughness: 0.0,
        color: 0xffffff,
        metalness: 0.2,
        roughness: 0.24,
        name: 'floorMat',
        side: THREE.FrontSide,
        envMapIntensity: 0.2,
        // bumpScale: 0.0005
    });
    floorMat.envMapRotation.set(0.81, 0.27, 0.67)
    
    
    rgbeLoader.load('textures/' + 'royal_esplanade_1k' + '.hdr', (texture) => {
        floorMat.envMap = texture
        floorMat.needsUpdate = true;
        texture.mapping = THREE.EquirectangularReflectionMapping;
    })
    let folder = 'textures/1024/';
    function applyTexture(path, property, extra = () => {}) {
        textureLoader.load(`${folder}${path}`, function(map) {
            map.wrapS = THREE.RepeatWrapping;
            map.wrapT = THREE.RepeatWrapping;
            map.anisotropy = 1;
            map.repeat.set(0.25, 6);
            extra(map);
            floorMat[property] = map;
            floorMat.needsUpdate = true;
            floorMat.bumpScale = 0.85
        });
    }

    applyTexture('hardwood2_diffuse.jpg', 'map', map => map.encoding = THREE.sRGBEncoding);
    applyTexture('hardwood2_bump.jpg', 'bumpMap');
    applyTexture('hardwood2_roughness.jpg', 'roughnessMap');
    
    const floor = new THREE.Mesh(geo, floorMat);
    floor.rotation.x = -Math.PI / 2; // Rotate to make it horizontal
    floor.receiveShadow = true; // Enable shadow receiving
    floor.position.set(3, 0, -4); // Adjust position as needed
    floor.name = 'floor';
    floor.scale.set(20, 24.8, 1); // Scale the floor to desired size
    
    // scene.add(floor);
    return floor;
}

function addTweenData(item, scene){
    let parent = item.initialParent || item.parent
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
        // Store the original scale
        scale: item.scale.clone(), // when binding rapier, scale might be changed and need to update
        parent: parent
    };
    // scene.tweenData = scene.tweenData || [];
    // scene.tweenData.push(itemData);
    scene.tweenData = scene.tweenData || {}
    scene.tweenData[item.uuid] = itemData;
}

export function adjustWalls(scene){
    wallMat.envMap = scene.environment; // Set the environment map for the wall material
    // const walls = new THREE.Group();
    // scene.add(walls)

    //floor
    const floor = addFloor();
    scene.add(floor);
    addTweenData(floor, scene)


    let leftWall = scene.getObjectByName('leftWall');
    let rightWall = scene.getObjectByName('rightWall');
    let backWall = scene.getObjectByName('backWall');
    let frontWall = scene.getObjectByName('frontWall');
    


    leftWall.material = wallMat;
    rightWall.material = wallMat;
    scene.getObjectByName('rightWall-cover').material = wallMat;

    backWall.material = backWallMat;
    frontWall.material = wallMat;


}

