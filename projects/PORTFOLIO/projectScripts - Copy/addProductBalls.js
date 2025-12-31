import * as THREE from 'three';
import { BasicGeometries } from '../configs/setupGeometries.js';
import * as CONSTANTS from './constant.js';
import { textureLoader } from '../configs/setupLoaders.js';
import RAPIER from './rapier3d-compat.js';
import { bindBodyObject } from './addRapierWorld.js';
import * as RAYCAST from './addRaycaster.js';

// Material definitions
const ballMeshMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, // White to show transparent texture parts as white
    transparent: true,
    opacity: 0.4, // Slightly transparent for aesthetic
    roughness: 0.2, // Low roughness for a glassy look
    metalness: 0.1, // Subtle metallic sheen
    clearcoat: 0.8, // High clearcoat for a polished surface
    clearcoatRoughness: 0.2,
    side: THREE.DoubleSide, // Render both sides of the cube
});
ballMeshMaterial.name = 'ballMeshMaterial';

const goldOuterGlowMat = CONSTANTS.createOuterGlowMat("#FBC189", 1, 0.01, 6.5, THREE.FrontSide);
goldOuterGlowMat.name = 'goldOuter';

// Fallback material for texture loading failure
const fallbackMaterial = new THREE.MeshBasicMaterial({
    color: 0xcccccc, // Light gray fallback
    side: THREE.DoubleSide,
    transparent: true,
});

// Reusable assets
const baseBallRadius = 0.5;

// Helper function to fetch top products from Product Hunt
async function fetchTopProducts() {
    const startOfRange = "2025-08-05T00:00:00Z";
    const endOfRange = "2025-08-06T23:59:59Z";

    const query = `
        query {
            ai: posts(first: 10, order: VOTES, postedAfter: "${startOfRange}", postedBefore: "${endOfRange}", topic: "artificial-intelligence") {
                edges {
                    node {
                        id
                        name
                        tagline
                        description
                        url
                        votesCount
                        thumbnail {
                            url
                        }
                        topics(first: 2) {
                            edges {
                                node {
                                    name
                                }
                            }
                        }
                    }
                }
            }
        }
    `;

    try {
        const response = await fetch('https://api.producthunt.com/v2/api/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer BDD6wjaF-GxRlg9IPf-l8q2OLguM0cTa1q9UmBcnMak'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) throw new Error('Failed to fetch data');

        const data = await response.json();
        if (data.errors) throw new Error(data.errors[0].message);

        const topProducts = data.data.ai.edges
            .map(({ node }) => ({
                id: node.id,
                name: node.name,
                tagline: node.tagline,
                description: node.description || 'No description available',
                url: node.url,
                votesCount: node.votesCount,
                thumbnail: node.thumbnail?.url || 'https://via.placeholder.com/80',
                topics: node.topics.edges.map(edge => edge.node.name)
            }))
            .sort((a, b) => b.votesCount - a.votesCount)
            .slice(0, 10);

        console.log('Top AI Software Launches:', topProducts);
        return topProducts;
    } catch (error) {
        console.error('Error fetching data:', error.message);
        return [];
    }
}

// Helper function to store initial data for tweens
function addTweenData(item, scene) {
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
    };
    scene.tweenData = scene.tweenData || [];
    scene.tweenData.push(itemData);
}

// Helper function to get random float
function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

// Main function to create a Product Ball (now a cube)
async function addProductBall(scene, productData) {
    const rapierWorld = scene.world;
    const votesCount = productData.votesCount || 1; // Fallback to 1 to avoid zero radius
    const ballRadius = baseBallRadius * (1 + Math.log(votesCount) / 10); // Scale radius with multiplier 1

    // Create cube geometry for the ball mesh
    const cubeGeometry = new THREE.BoxGeometry(ballRadius * 2, ballRadius * 2, ballRadius * 2); // Double radius for full size
    let cubeMaterial;
    try {
        const texture = await textureLoader.loadAsync(productData.thumbnail);
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;
        cubeMaterial = new THREE.MeshPhysicalMaterial({
            map: texture,
            color: 0xffffff, // White background for transparent texture parts
            transparent: true,
            opacity: 0.4,
            roughness: 0.2,
            metalness: 0.1,
            clearcoat: 0.8,
            clearcoatRoughness: 0.2,
            side: THREE.DoubleSide,
        });
    } catch (error) {
        console.error(`Failed to load texture for ${productData.name}:`, error.message);
        cubeMaterial = fallbackMaterial;
    }

    // Create the cube mesh (formerly ballMesh)
    const ballMesh = new THREE.Mesh(cubeGeometry, cubeMaterial);
    const ballScale = ballRadius * 1.25;
    ballMesh.scale.setScalar(ballScale / ballRadius); // Adjust scale for cube size
    ballMesh.name = `productBall_${productData.id}`;
    ballMesh.castShadow = true;
    scene.add(ballMesh);

    // Add aura mesh (still spherical)
    const ballAuraMesh = new THREE.Mesh(BasicGeometries.sphere, goldOuterGlowMat);
    ballAuraMesh.name = `aura_${productData.id}`;
    ballAuraMesh.scale.setScalar(2.2);
    ballMesh.add(ballAuraMesh);
    ballAuraMesh.ignoreRaycast = true;

    // Add physics (using ball collider for simplicity)
    const body = rapierWorld.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(ballMesh.position.x, ballMesh.position.y, ballMesh.position.z)
            .setCanSleep(true)
    );
    const shape = RAPIER.ColliderDesc.ball(ballScale / 2)
        .setRestitution(0.4)
        .setMass(getRandomFloat(1, 5));

    ballMesh.rapierBody = body;
    ballMesh.rapierShape = shape;
    body.threeMesh = ballMesh;
    body.rapierShape = shape;
    scene.world.ballBodies = scene.world.ballBodies || [];
    scene.world.ballBodies.push(body);

    // Add raycast interaction
    RAYCAST.addRaycastObject(
        scene,
        ballMesh,
        {
            onMouseEnter: () => { },
            onMouseLeave: () => RAYCAST.restoreMaterials(scene),
            onMouseDown: toggleGravityMode
        }
    );

    // Store product data in mesh for potential use
    ballMesh.userData = { product: productData };

    function toggleGravityMode() {
        scene.world.hasPointGravityOnBalls = !scene.world.hasPointGravityOnBalls;
        scene.world.gravity = new RAPIER.Vector3(0.0, -9.81, 0.0);
        scene.world.gravityCenterForBalls = new THREE.Vector3(0.0, 7.2, 0.0);
        if (!scene.world.hasPointGravityOnBalls) {
            scene.world.ballBodies.forEach((body) => {
                body.threeMesh.children[0].visible = true;
                const bodyPosition = body.translation();
                const direction = new THREE.Vector3(
                    scene.world.gravityCenterForBalls.x - bodyPosition.x,
                    Math.abs(scene.world.gravityCenterForBalls.y - bodyPosition.y),
                    scene.world.gravityCenterForBalls.z - bodyPosition.z
                );
                const force = direction.normalize().multiplyScalar(-Math.random() * 50 * body.mass());
                body.applyImpulse(force, false);
            });
        }
    }

    addTweenData(ballMesh, scene);
    scene.bhTargets = scene.bhTargets || [];
    scene.bhTargets.push(ballMesh);
    return ballMesh;
}

// Main function to add Product Balls
export async function addProductBalls(scene) {
    // Set initial physics properties after 30 seconds
    setTimeout(() => {
        scene.world.hasPointGravityOnBalls = true;
        scene.world.gravity = new RAPIER.Vector3(0.0, -9.81, 0.0);
        scene.world.gravityCenterForBalls = new THREE.Vector3(0.0, 7.2, 0.0);
    }, 30000);

    // Fetch top products from Product Hunt
    const products = await fetchTopProducts();

    // Create a Product Ball for each product
    for (const product of products) {
        const mesh = await addProductBall(scene, product);
        mesh.rotation.y = Math.PI / 2;
        mesh.position.x = getRandomFloat(-2, 3);
        mesh.position.y = getRandomFloat(5, 10);
        mesh.position.z = getRandomFloat(-3, 5);
        bindBodyObject(scene, mesh, mesh.rapierBody, mesh.rapierShape);
    }
}