import * as THREE from 'three';
import { BasicGeometries } from '../configs/setupGeometries.js'; // Basic geometries for the scene
import * as CONSTANTS from './constant.js';
// import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import RAPIER from './rapier3d-compat.js';
import { bindBodyObject } from './addRapierWorld.js';
import * as RAYCAST from './raycast/addRaycaster.js';

// const goldInnerGlowMat = CONSTANTS.createInnerGlowMat("#FBC189", 1., 1);
// goldInnerGlowMat.name = 'goldInner'


// const goldOuterGlowMat = CONSTANTS.createOuterGlowMat("#FBC189",  1, 0.01, 6.5, THREE.FrontSide)
// goldOuterGlowMat.name = 'goldOuter'
// const goldInnerGlowMatSkinned = CONSTANTS.createInnerGlowMatSkinned("#dcd0ba", 1., 1) //for skinned mesh to maintain animation

// --- Reusable assets defined once for performance ---
const ballGeo = BasicGeometries.sphere;

const ballMaterial = CONSTANTS.goldInnerGlowMat
// const ballMaterial = CONSTANTS.goldOscillatingMat
const ballRadius = 0.5
const starShape = new THREE.Shape();
const spikes = 5;
const outerRadius = 0.15 * ballRadius;
const innerRadius = 0.07 * ballRadius;

for (let i = 0; i < spikes * 2; i++) {
    const angle = (i / (spikes * 2)) * Math.PI * 2;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) {
        starShape.moveTo(x, y);
    } else {
        starShape.lineTo(x, y);
    }
}
starShape.closePath();

const starGeometry = new THREE.ShapeGeometry(starShape);
const starMaterial = new THREE.MeshBasicMaterial({
    color: 0xfbbd9d, // Deep red color for the stars
    side: THREE.DoubleSide,
    toneMapped: false,
});

function getPointPositions(count) {
    // --- Input Validation ---
    // Ensure the input is an integer between 1 and 7.
    if (!Number.isInteger(count) || count < 1 || count > 7) {
        console.error("Error: Input must be an integer between 1 and 7.");
        return []; // Return an empty array for invalid input
    }

    const positions = [];
    const PI = Math.PI;

    // --- Rule 1: count = 1 ---
    // Place a single point at the center (0,0).
    if (count === 1) {
        positions.push({ x: 0, y: 0 });
        return positions;
    }

    // --- Rule 2: count is 2, 3, or 4 ---
    // Place points as vertices of a regular polygon (line, triangle, square)
    // inscribed in a circle of radius 0.5.
    if (count >= 2 && count <= 4) {
        const radius = 0.2 * ballRadius;
        const numVertices = count;
        // We subtract PI/2 to start the first point at the top for a more standard orientation.
        const angleOffset = -PI / 2;

        for (let i = 0; i < numVertices; i++) {
            const angle = (2 * PI * i / numVertices) + angleOffset;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            // Round to a few decimal places for cleaner output
            positions.push({ x: parseFloat(x.toFixed(4)), y: parseFloat(y.toFixed(4)) });
        }
        return positions;
    }

    // --- Rule 3: count is 5, 6, or 7 ---
    // Place one point at the center, and the rest as vertices of a regular polygon
    // (quadrilateral, pentagon, hexagon) inscribed in a circle of radius 0.75.
    if (count >= 5 && count <= 7) {
        // First, place a point at the center.
        positions.push({ x: 0, y: 0 });

        const radius = 0.35 * ballRadius;
        const numVertices = count - 1; // e.g., for count=5, we need a 4-sided polygon (quadrilateral).
        const angleOffset = -PI / 2;

        for (let i = 0; i < numVertices; i++) {
            const angle = (2 * PI * i / numVertices) + angleOffset;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            positions.push({ x: parseFloat(x.toFixed(4)), y: parseFloat(y.toFixed(4)) });
        }
        return positions;
    }

    // This part of the code should not be reachable due to the initial validation.
    return positions;
}
// --- Helper function to store initial data for tweens ---
function addTweenData(item, scene) {
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

const targetPosition = new THREE.Vector3(0, 0, 0);

// --- Main function to create a Dragon Ball ---

export function addDragonBall(scene, numberOfStars = 4) {
    scene.bhTargets ||= [];
    // const ballRadius = 1;
    const rapierWorld = scene.world
    // console.log(scene.world)
    // Create the outer orange sphere using the reusable geometry and material
    // const ballMesh = new THREE.Mesh(ballGeo, ballMaterial);
    const ballMesh = new THREE.Mesh(ballGeo, CONSTANTS.goldOscillatingMat);
    // ballMaterial.envMap = scene.environment;
    const ballScale = ballRadius * 1.25
    ballMesh.scale.setScalar(ballScale);
    scene.add(ballMesh);
    ballMesh.name = `dragonBall${numberOfStars}Stars`;
    ballMesh.castShadow = true

    // let ballAuraMesh = new THREE.Mesh(ballGeo, CONSTANTS.goldOuterGlowMat);
    const ballAuraMesh = new THREE.Mesh(ballGeo, CONSTANTS.goldOscillatingOuterGlowMat);
    ballAuraMesh.name = `Aura${numberOfStars}Stars`;
    ballAuraMesh.scale.setScalar(2.2)
    ballMesh.add(ballAuraMesh)
    ballAuraMesh.ignoreRaycast = true
    // ballAuraMesh.onRayCast = function(){
    //    ballAuraMesh.material =  goldOuterGlowMat
    // }

    //add physics rapier

    const body = rapierWorld.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(ballMesh.position.x, ballMesh.position.y, ballMesh.position.z)
            .setCanSleep(false)
        // .setCcdEnabled(true)
    );
    const shape = RAPIER.ColliderDesc.ball(ballScale / 2)
        .setRestitution(.4) // Low bounciness for a glass-like feel. 0 is no bounce, 1 is a perfect bounce.
        .setMass(getRandomFloat(1, 5))

    // Make the ball feel dense and heavy like solid glass.
    // rapierWorld.createCollider(shape, body);
    // 4. Create the Collider and attach it to the Rigid Body.

    ballMesh.rapierBody = body
    ballMesh.rapierShape = shape
    body.threeMesh = ballMesh
    body.rapierShape = shape
    scene.world.ballBodies = scene.world.ballBodies || []
    scene.world.ballBodies.push(body)




    // scene.raycastObjects = scene.raycastObjects || [];
    // scene.raycastObjects.push(ballMesh);
    RAYCAST.addRaycastObject(
        scene,
        ballMesh,
        {
            onMouseEnter: (ballMesh) => { return },
            onMouseLeave: () => RAYCAST.restoreMaterials(scene),
            onMouseDown: toggleGravityMode
        }
    )

    let positions = getPointPositions(numberOfStars);
    positions.forEach(pos => {
        const star = new THREE.Mesh(starGeometry, starMaterial);
        const r = 1.5
        star.scale.setScalar(r * (0.049 * numberOfStars * numberOfStars - 0.467 * numberOfStars + 1.618))
        star.name = "star";
        star.position.set(pos.x, pos.y, 0);
        ballMesh.add(star);

    })


    function toggleGravityMode() {
        (clickedObject, intersection) => RAYCAST.applyImpulse(scene, clickedObject, intersection)
        scene.world.hasPointGravityOnBalls = !scene.world.hasPointGravityOnBalls;
        scene.world.gravity = new RAPIER.Vector3(0.0, -9.81, 0.0)
        scene.world.gravityCenterForBalls = new THREE.Vector3(0.0, 7.2, 0.0)
        scene.world.ballBodies.forEach((body) => {
            // body.threeMesh.children[0].visible = false
        })
        // scene.world.gravityStrength = 0.1;
        if (!scene.world.hasPointGravityOnBalls) { //exploade balls
            scene.world.ballBodies.forEach((body) => {
                body.threeMesh.children[0].visible = true
                const bodyPosition = body.translation();
                const direction = new THREE.Vector3(
                    scene.world.gravityCenterForBalls.x - bodyPosition.x,
                    Math.abs(scene.world.gravityCenterForBalls.y - bodyPosition.y),
                    scene.world.gravityCenterForBalls.z - bodyPosition.z
                );
                const force = direction.normalize().multiplyScalar(- Math.random() * 50 * body.mass());
                body.applyImpulse(force, false)
            })
        }
    }
    addTweenData(ballMesh, scene);
    scene.bhTargets.push(ballMesh)
    return ballMesh;
}
function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

export function addDragonBalls(scene) {
    // setTimeout(()=>{
    //     activateDragonBallPointGravity(scene)
    // },5500)

    for (let i = 1; i < 8; i++) {
        let mesh = addDragonBall(scene, i)
        mesh.rotation.y = Math.PI / 2

        mesh.position.x = getRandomFloat(2, 7)
        mesh.position.y = getRandomFloat(0.4, 2)
        mesh.position.z = getRandomFloat(-2, 0)

        bindBodyObject(scene, mesh, mesh.rapierBody, mesh.rapierShape)
    }

    // const torusKnotMesh = new THREE.Mesh(new THREE.TorusKnotGeometry(), new THREE.MeshNormalMaterial())
    // torusKnotMesh.castShadow = true
    // torusKnotMesh.position.set(1,5,0)

    // // scene.add(torusKnotMesh)
    // torusKnotMesh.name = 'ro'
    // let t = getBodyShapeFromMesh(scene,torusKnotMesh)
    // bindBodyMesh(scene, torusKnotMesh, t.body, t.shape)

}

function moveToLocation(dynamicBody, targetPosition, forceScalingFactor = 10) {
    if (!dynamicBody) {
        console.error("Dynamic body is not valid!");
        return;
    }

    const currentPosition = new THREE.Vector3().copy(dynamicBody.translation());
    const direction = new THREE.Vector3();
    direction.subVectors(targetPosition, currentPosition);
    direction.y = 0;
    const distance = direction.length();

    if (distance < 0.1) {
        return;
    }

    direction.normalize();
    const impulseMagnitude = distance * forceScalingFactor;
    const impulse = {
        x: direction.x * impulseMagnitude,
        y: 0,
        z: direction.z * impulseMagnitude
    };

    dynamicBody.applyImpulse(impulse, true);
}

export function activateDragonBallPointGravity(scene) {
    scene.world.hasPointGravityOnBalls = true
    scene.world.gravity = new RAPIER.Vector3(0.0, -9.81, 0.0)
    scene.world.gravityCenterForBalls = new THREE.Vector3(0.0, 7.2, 0.0)
}


