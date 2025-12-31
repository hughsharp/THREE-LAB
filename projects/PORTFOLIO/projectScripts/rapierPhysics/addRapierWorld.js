import * as THREE from 'three';
// import * as CONSTANTS from './constant.js';
// import RAPIER from 'https://cdn.skypack.dev/@dimforge/rapier3d-compat';
import RAPIER from './rapier3d-compat.js';
// import RAPIER from 'https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.18.0/rapier_wasm3d.min.js'
await RAPIER.init()

const UpdateStrategy = {
    PHYSICS_TO_OBJECT: 'physicsToMesh', // Physics engine drives the 3D object
    OBJECT_TO_PHYSICS: 'meshToPhysics'  // 3D object (animation) drives the physics body
};

export class RAPIERWORLD {
    constructor(scene, { debuggerEnabled = false, isActive = true } = {}) {
        this.scene = scene;

        // console.log('Is active', isActive)

        const gravity = new RAPIER.Vector3(0.0, -9.81, 0.0)
        const world = new RAPIER.World(gravity)
        // console.log(world)
        this.gravity = gravity
        this.world = world
        scene.world = world
        scene.rapierWorldWrapper = this

        this.debuggerEnabled = debuggerEnabled
        this.isActive = isActive

        this.world.isActive = isActive;
        this.world.debuggerEnabled = debuggerEnabled;
        this.world.isPaused = false;
        // this.debuggerEnabled = debuggerEnabled
        // this.isActive = isActive

        this.world.productBodies = []

        this.world.hasPointGravityOnBalls = false //for pull/push fucntion
        this.world.hasPointGravityOnBH = false
        this.world.hasPointGravityOnProducts = true
        this.world.gravityStrength = 0.1;

        this.world.gravityCenterForBH = new RAPIER.Vector3(-6.5, 7.10, -0.39)
        this.world.gravityCenterForBalls = new THREE.Vector3(0.0, 7.2, 0.0)
        this.world.gravityCenterForProducts = new THREE.Vector3(0.0, 7.2, -3)
        this.world.gravityPoints = [
            {
                name: 'pokemon',
                isActive: false,
                affectedBodies: [],
                gravityCenter: ''
            }
        ]

        // const sphereBody = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(-2.5, 5, 0).setCanSleep(false))
        // const sphereShape = RAPIER.ColliderDesc.ball(1).setMass(1).setRestitution(1.1)
        // world.createCollider(sphereShape, sphereBody)

        const geometry = new THREE.BufferGeometry();
        const material = new THREE.LineBasicMaterial({ vertexColors: true, toneMapped: false });
        const lines = new THREE.LineSegments(geometry, material);
        if (debuggerEnabled) scene.add(lines);
        this.lines = lines;

        // --- CHANGE: Create a floor with thickness so objects don't fall through ---
        // The top of the floor is at y=0.
        let thickness = 10
        const floorBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -1 * thickness, 0))
        const floorShape = RAPIER.ColliderDesc.cuboid(200, thickness, 200)

        world.createCollider(floorShape, floorBody)
    }

    pullBody(body, gravityCenter, appliedPullingFactor = 1) {
        const bodyPosition = body.translation();
        const direction = new THREE.Vector3(
            gravityCenter.x - bodyPosition.x,
            gravityCenter.y - bodyPosition.y,
            gravityCenter.z - bodyPosition.z
        );
        if (direction.length() < 0.1) return;

        const pullingDampness = body.pullingDampness || 0.0;
        const force = direction.normalize().multiplyScalar(this.world.gravityStrength * 9.81 * body.mass() * appliedPullingFactor * (1 - pullingDampness));
        // body.wakeUp()
        body.applyImpulse(force, true);
    }

    applyPointGravityOnBalls(appliedPullingFactor = 0.45) {
        this.world.ballBodies.forEach((body) => {
            this.pullBody(body, this.world.gravityCenterForBalls, appliedPullingFactor)
        });
    }

    applyPointGravityOnPokeball(appliedPullingFactor = 1) {
        this.pullBody(this.world.pokeballBody, this.world.gravityCenterForPokeball, appliedPullingFactor)
    }

    applyPointGravityOnBH(appliedPullingFactor = 0.52) {
        // this.world.ballBodies.forEach((body) => {
        //     this.pullBody(body, this.world.gravityCenterForBalls,appliedPullingFactor)
        // });
        this.scene.bhTargets.forEach((target) => {
            try {
                let body = target.rapierBody
                this.pullBody(body, this.world.gravityCenterForBH, appliedPullingFactor)
                // console.log(body.pullingDampness)
            } catch (e) {
                console.log(target)
                console.log(e)
            }
        })
    }

    applyPointGravityOnProducts(appliedPullingFactor = 0.45) {
        if (this.world.productBodies.length == 0) return
        this.world.productBodies.forEach((body) => {
            this.pullBody(body, this.world.gravityCenterForProducts, appliedPullingFactor)
        });
    }

    /**
     * Adds a new gravity point.
     * @param {string} name - Unique identifier for the gravity point.
     * @param {THREE.Vector3|RAPIER.Vector3} gravityCenter - The center position of gravity.
     * @param {Array} affectedBodies - List of bodies affected by this point.
     * @param {boolean} isActive - Whether the gravity point is active.
     */
    addGravityPoint(gravityPoint) {
        // 1. Validate that the input is an instance of the GravityPoint class
        if (!(gravityPoint instanceof GravityPoint)) {
            console.error("RAPIERWORLD: Argument must be an instance of the GravityPoint class.");
            return;
        }

        // 2. Check if a point with this name already exists
        const exists = this.world.gravityPoints.some(point => point.name === gravityPoint.name);

        if (exists) {
            console.warn(`RAPIERWORLD: A gravity point with the name "${gravityPoint.name}" already exists. Addition skipped.`);
            return;
        }

        // 3. Add to the array
        this.world.gravityPoints.push(gravityPoint);

        console.log(`Gravity point "${gravityPoint.name}" added.`);
    }

    /**
     * Retrieves a gravity point object by its name.
     * @param {string} name - The name of the gravity point to find.
     * @returns {Object|undefined} The gravity point object or undefined if not found.
     */
    getGravityPointByName(name) {
        return this.world.gravityPoints.find(point => point.name === name);
    }

    update(delta) {
        if (this.world.isPaused) return
        if (!this.world.isActive) return
        this.world.timestep = Math.min(delta, 0.1)


        //physics to object
        if (this.scene.physicsControlledObjects) {
            this.scene.physicsControlledObjects.forEach(object => {
                // if (object.isRapierExcluded) return
                if (!object.isRapierBound) return
                object.position.copy(object.rapierBody.translation())
                object.quaternion.copy(object.rapierBody.rotation())
            })
        }


        if (this.world.hasPointGravityOnBalls) this.applyPointGravityOnBalls()
        if (this.world.hasPointGravityOnBH) this.applyPointGravityOnBH()
        if (this.world.hasPointGravityOnProducts) this.applyPointGravityOnProducts()

        this.world.gravityPoints.forEach(point => {
            if (!point.isActive) return;
            point.affectedBodies.forEach(body => {
                this.pullBody(body, point.gravityCenter)
            })
        })

        // debugger
        if (this.debuggerEnabled) {
            const { vertices, colors } = this.world.debugRender();
            this.lines.geometry.setAttribute(
                'position',
                new THREE.BufferAttribute(vertices, 3)
            );
            this.lines.geometry.setAttribute(
                'color',
                new THREE.BufferAttribute(colors, 4)
            );
        }

        this.world.step()
    }
}

export function bindBodyObject(scene, object, body, shape, options = {}) {

    const pullingDampness = options.pullingDampness || 0.0;
    body.pullingDampness = pullingDampness;
    const isIntegrityCheckTarget = options.isIntegrityCheckTarget || false;
    body.isIntegrityCheckTarget = isIntegrityCheckTarget;

    // Default 'isIntegrityResetTarget' to true if 'isIntegrityCheckTarget' is true and it wasn't explicitly provided.
    // Otherwise default to the provided value or false.
    let isIntegrityResetTarget;
    if (options.isIntegrityResetTarget !== undefined) {
        isIntegrityResetTarget = options.isIntegrityResetTarget;
    } else {
        isIntegrityResetTarget = isIntegrityCheckTarget === true;
    }
    body.isIntegrityResetTarget = isIntegrityResetTarget;

    const updateStrategy = options.updateStrategy || UpdateStrategy.PHYSICS_TO_OBJECT;
    switch (updateStrategy) {
        case UpdateStrategy.PHYSICS_TO_OBJECT:
            scene.physicsControlledObjects = scene.physicsControlledObjects || []
            scene.physicsControlledObjects.push(object)
            break;

        case UpdateStrategy.OBJECT_TO_PHYSICS:
            scene.objectControlledBodies = scene.objectControlledBodies || []
            scene.objectControlledBodies.push(body)
            break;
    }
    scene.physicBodies = scene.physicBodies || []
    scene.physicBodies.push(body)

    scene.physicObjects = scene.physicObjects || []
    scene.physicObjects.push(object)

    // Re-parent the mesh to the main scene, automatically
    // adjusting its local position/rotation to keep its world transform the same.

    scene.attach(object);

    if (scene.tweenData && scene.tweenData[object.uuid]) {
        scene.tweenData[object.uuid].scale = object.scale.clone()
    }


    body.setTranslation(object.position)
    body.setRotation(object.quaternion)
    const collider = scene.world.createCollider(shape, body);

    object.rapierBody = body
    object.rapierShape = shape
    object.rapierCollider = collider

    body.threeObject = object
    body.rapierShape = shape
    body.rapierCollider = collider

    object.isRapierBound = true;
    body.isObjectBound = true;
}

// export function getFreeFormBodyShapeFromMesh(scene, mesh, options = {}) {
//     let world = scene.world;
//     const scale = mesh.getWorldScale(new THREE.Vector3());

//     let mass = options.mass || 1;
//     let restitution = options.restitution || 0.5;
//     let canSleep = options.canSleep || false;
//     let linearDamping = options.linearDamping || 0;
//     let angularDamping = options.angularDamping || 0;
//     let bodyType = options.bodyType || 'dynamic';

//     let desc = getBodyType(bodyType)


//     // Set properties on the description BEFORE creating the body
//     desc.setCanSleep(canSleep);
//     desc.setLinearDamping(linearDamping);
//     desc.setAngularDamping(angularDamping);


// // Now create the body from the fully configured descriptor
//     const body = world.createRigidBody(desc);
//     // const body = world.createRigidBody(
//     //     RAPIER.RigidBodyDesc.dynamic()

//     //         .setCanSleep(canSleep)
//     //         .setLinearDamping(linearDamping)
//     //         .setAngularDamping(angularDamping)
//     // );

//     // 1. Get the original, unscaled vertices and indices
//     const vertices = mesh.geometry.attributes.position.array;
//     const indices = mesh.geometry.index.array;

//     for (let i = 0; i < vertices.length; i += 3) {
//         vertices[i] = vertices[i] * scale.x;     // Scale x-coordinate
//         vertices[i + 1] = vertices[i + 1] * scale.y; // Scale y-coordinate
//         vertices[i + 2] = vertices[i + 2] * scale.z; // Scale z-coordinate
//     }
//     // 3. Create the trimesh collider with the scaled vertices
//     const shape = RAPIER.ColliderDesc.trimesh(vertices, indices)
//         .setMass(mass)
//         .setRestitution(restitution);

//     return { body, shape };
// }

export function getFreeFormBodyShapeFromMesh(scene, mesh, options = {}) {
    const world = scene.world;


    // --- 1. Set Physics Options with Offset ---
    const mass = options.mass ?? 1;
    const restitution = options.restitution ?? 0.5;
    const friction = options.friction ?? 0.5;
    const canSleep = options.canSleep ?? false;
    const linearDamping = options.linearDamping ?? 0;
    const angularDamping = options.angularDamping ?? 0;
    const bodyType = options.bodyType || 'dynamic';
    const isConvexHull = options.isConvexHull || false;
    // Get the offset option, default to a zero vector
    const offset = options.offset ?? new THREE.Vector3();

    // --- 2. Get Mesh's World Transform ---
    // This defines where the Rigid Body will be placed in the world.
    mesh.updateWorldMatrix(true, false);
    const worldPosition = mesh.getWorldPosition(new THREE.Vector3());
    const worldRotation = mesh.getWorldQuaternion(new THREE.Quaternion());
    const scale = mesh.getWorldScale(new THREE.Vector3());

    // --- 3. Create and Configure Rigid Body Description ---
    let desc = getBodyType(bodyType)
        .setTranslation(worldPosition.x, worldPosition.y, worldPosition.z)
        .setRotation(worldRotation)
        .setCanSleep(canSleep)
        .setLinearDamping(linearDamping)
        .setAngularDamping(angularDamping);

    const body = world.createRigidBody(desc);

    // --- 4. Prepare Scaled Trimesh Data (Crucial Fix) ---
    const positionAttribute = mesh.geometry.attributes.position;
    const indices = mesh.geometry.index.array;

    // Create a new array for scaled vertices to AVOID MUTATING the mesh geometry
    const scaledVertices = new Float32Array(positionAttribute.count * 3);

    for (let i = 0; i < positionAttribute.count; i++) {
        const x = positionAttribute.getX(i) * scale.x;
        const y = positionAttribute.getY(i) * scale.y;
        const z = positionAttribute.getZ(i) * scale.z;

        scaledVertices[i * 3] = x;
        scaledVertices[i * 3 + 1] = y;
        scaledVertices[i * 3 + 2] = z;
    }

    // --- 5. Create the Trimesh Collider Shape with Offset ---
    let shape
    // const shape = RAPIER.ColliderDesc.trimesh(scaledVertices, indices)
    //     // .setMass(mass)
    //     .setRestitution(restitution)
    //     // Apply the offset (collider translation relative to the rigid body)
    //     .setTranslation(offset.x, offset.y, offset.z); 

    if (isConvexHull) {
        shape = RAPIER.ColliderDesc.convexHull(scaledVertices)
            .setMass(mass)
            .setRestitution(restitution)
            .setFriction(friction)
            // Apply the offset (collider translation relative to the rigid body)
            .setTranslation(offset.x, offset.y, offset.z);
    } else {
        shape = RAPIER.ColliderDesc.trimesh(scaledVertices, indices)
            .setMass(mass)
            .setRestitution(restitution)
            .setFriction(friction)
            // Apply the offset (collider translation relative to the rigid body)
            .setTranslation(offset.x, offset.y, offset.z);
    }
    return { body, shape };
}

export function getFreeFormBodyShapeFromGroup(scene, group, options = {}) {
    const world = scene.world;

    // Set physics options with fallbacks
    const mass = options.mass || 1;
    const restitution = options.restitution || 0.5;
    const canSleep = options.canSleep || false;
    const linearDamping = options.linearDamping || 0;
    const angularDamping = options.angularDamping || 0;
    const bodyType = options.bodyType || 'dynamic';

    // Create rigid body description based on type
    let desc = getBodyType(bodyType)
    // Apply damping and sleep settings
    desc.setCanSleep(canSleep);
    desc.setLinearDamping(linearDamping);
    desc.setAngularDamping(angularDamping);

    // Create the rigid body in the physics world
    const body = world.createRigidBody(desc);

    // Prepare to merge geometry for collider
    const mergedVertices = [];
    const mergedIndices = [];
    let vertexOffset = 0;

    group.updateWorldMatrix(true, true);

    group.traverse((child) => {
        if (child.isMesh && child.geometry && child.visible) {
            const geometry = child.geometry;
            const position = geometry.attributes.position;
            const index = geometry.index;

            if (!position || !index) return;

            const worldScale = child.getWorldScale(new THREE.Vector3());
            const temp = new THREE.Vector3();

            // Scale and collect vertex positions
            for (let i = 0; i < position.count; i++) {
                temp.fromBufferAttribute(position, i);
                temp.multiply(worldScale);
                mergedVertices.push(temp.x, temp.y, temp.z);
            }

            // Offset and collect indices
            for (let i = 0; i < index.count; i++) {
                mergedIndices.push(index.array[i] + vertexOffset);
            }

            vertexOffset += position.count;
        }
    });

    // Create trimesh collider shape
    const shape = RAPIER.ColliderDesc.trimesh(mergedVertices, mergedIndices)
        .setMass(mass)
        .setRestitution(restitution);

    return { body, shape };
}




export function getBodyShapeByBoundingBox0(scene, object3D, options = {}) {

    const world = scene.world;

    // --- 1. Set Physics Options ---
    // Use provided options or fall back to sensible defaults.
    const mass = options.mass ?? 1;
    const restitution = options.restitution ?? 0.5;
    const canSleep = options.canSleep ?? false;
    const linearDamping = options.linearDamping ?? 0;
    const angularDamping = options.angularDamping ?? 0;
    const bodyType = options.bodyType || 'dynamic';
    let scale = options.scale || new THREE.Vector3(1, 1, 1);
    // console.log(object3D.name, scale)
    // console.log(options.scale)
    if (options.scale instanceof THREE.Vector3) {
        scale = scale
    } else {
        let r = parseFloat(options.scale);
        if (isNaN(r)) r = 1; // default fallback
        scale = new THREE.Vector3(r, r, r);
    }
    // console.log(object3D.name, scale)
    // --- 2. Create Rigid Body Description ---
    // This defines the fundamental behavior of the physics body.
    let desc = getBodyType(bodyType);


    // Apply additional properties to the description.
    desc.setCanSleep(canSleep);
    desc.setLinearDamping(linearDamping);
    desc.setAngularDamping(angularDamping);

    // --- 3. Create the Rigid Body ---
    // Instantiate the body in the physics world.
    const body = world.createRigidBody(desc);

    // --- 4. Calculate the Group's Bounding Box ---
    // This is the core difference from the trimesh function.
    // We compute a single Axis-Aligned Bounding Box (AABB) that contains all visible meshes in the group.
    const boundingBox = new THREE.Box3();

    // Ensure all child object matrices are up-to-date before calculation.
    // object3D.updateWorldMatrix(true, true);

    // Calculate the bounding box of the group and all its children.
    // The `true` parameter makes the calculation recursive.
    boundingBox.setFromObject(object3D, true);
    const scaleMatrix = new THREE.Matrix4().makeScale(scale.x, scale.y, scale.z);
    boundingBox.applyMatrix4(scaleMatrix);
    // --- 5. Create a Cuboid Collider from the Bounding Box ---
    const size = new THREE.Vector3();
    boundingBox.getSize(size);
    // no need to multply by world scale
    // Rapier's cuboid collider takes half-extents (half the width, height, and depth).
    const hx = size.x / 2;
    const hy = size.y / 2 - 0.05; //fine tuning
    const hz = size.z / 2;

    // Create the collider description with the calculated dimensions.
    // Handle the case where a dimension might be zero to avoid creating an invalid collider.
    const shape = RAPIER.ColliderDesc.cuboid(
        Math.max(hx, 0.001), // Ensure a minimum size
        Math.max(hy, 0.001),
        Math.max(hz, 0.001)
    )
        .setMass(mass)
        .setRestitution(restitution);

    // --- 6. Return the Body and Shape ---
    // The caller is responsible for creating the collider from the shape description
    // and attaching it to the body. e.g., world.createCollider(shape, body);
    return { body, shape };
}
export function getBodyShapeByBoundingBox(scene, object3D, options = {}) {
    const world = scene.world;

    // --- 1. Set Physics Options ---
    const mass = options.mass ?? 1;
    const restitution = options.restitution ?? 0.5;
    const canSleep = options.canSleep ?? false;
    const linearDamping = options.linearDamping ?? 0;
    const angularDamping = options.angularDamping ?? 0;
    const bodyType = options.bodyType || 'dynamic';
    const yOffset = options.yOffset || -0.005;
    let scale = options.scale ?? new THREE.Vector3(1, 1, 1);
    // Get the offset option, default to a zero vector
    const offset = options.offset ?? new THREE.Vector3(0, 0, 0);

    if (options.scale instanceof THREE.Vector3) {
        scale = scale;
    } else {
        let r = parseFloat(options.scale);
        if (isNaN(r)) r = 1;
        scale = new THREE.Vector3(r, r, r);
    }

    // --- 2. Get Object's World Transform ---
    object3D.updateWorldMatrix(true, false);
    const worldPosition = object3D.getWorldPosition(new THREE.Vector3());
    const worldRotation = object3D.getWorldQuaternion(new THREE.Quaternion());

    // --- 3. Calculate Local Bounding Box to Get True Size ---
    const originalRotation = object3D.quaternion.clone();
    object3D.quaternion.identity();
    object3D.updateWorldMatrix(true, false);

    const localBoundingBox = new THREE.Box3().setFromObject(object3D, true);

    object3D.quaternion.copy(originalRotation);
    object3D.updateWorldMatrix(true, false);

    // --- 4. Create Cuboid Collider from Local Bounding Box ---
    const scaleMatrix = new THREE.Matrix4().makeScale(scale.x, scale.y, scale.z);
    localBoundingBox.applyMatrix4(scaleMatrix);

    const size = new THREE.Vector3();
    localBoundingBox.getSize(size);

    const hx = size.x / 2;
    const hy = size.y / 2 + yOffset; // fine-tuning
    const hz = size.z / 2;

    // UPDATED: The offset is now applied to the collider description
    const shape = RAPIER.ColliderDesc.cuboid(
        Math.max(hx, 0.001),
        Math.max(hy, 0.001),
        Math.max(hz, 0.001)
    )
        .setMass(mass)
        .setRestitution(restitution)
        // This sets the collider's position relative to the rigid body
        .setTranslation(offset.x, offset.y, offset.z);

    // --- 5. Create the Rigid Body with Correct Transform ---
    // The rigid body's transform should always match the visual object's transform
    const desc = getBodyType(bodyType)
        .setTranslation(worldPosition.x, worldPosition.y, worldPosition.z)
        .setRotation(worldRotation)
        .setCanSleep(canSleep)
        .setLinearDamping(linearDamping)
        .setAngularDamping(angularDamping);

    const body = world.createRigidBody(desc);

    // --- 6. Return the Body and Shape ---
    return { body, shape };
}
export function getBodyShapeByBoundingSphere(scene, object, options = {}) {
    let world = scene.world;

    const mass = options.mass ?? 1;
    const restitution = options.restitution ?? 0.5;
    const canSleep = options.canSleep ?? false;
    const linearDamping = options.linearDamping ?? 0;
    const angularDamping = options.angularDamping ?? 0;
    const bodyType = options.bodyType || 'dynamic';
    const scale = options.scale || 1;


    let desc = getBodyType(bodyType)

    desc.setCanSleep(canSleep);
    desc.setLinearDamping(linearDamping);
    desc.setAngularDamping(angularDamping);


    const body = world.createRigidBody(desc);

    const box = new THREE.Box3().setFromObject(object);
    const sphere = new THREE.Sphere();
    box.getBoundingSphere(sphere);
    // console.log(sphere)



    // 4. Create the ball (sphere) shape with the final radius
    const shape = RAPIER.ColliderDesc.ball(sphere.radius * scale);
    shape.setMass(mass)
    shape.setRestitution(restitution)
    return { body, shape };
}


function getBodyType(bodyType) {

    let desc;
    switch (bodyType) {
        case 'fixed':
            // Fixed bodies are static and immovable (e.g., the ground).
            desc = RAPIER.RigidBodyDesc.fixed();
            break;
        case 'kinematicPosition':
            // Kinematic bodies are moved by code, not by physics forces, but still affect other bodies.
            desc = RAPIER.RigidBodyDesc.kinematicPositionBased();
            break;
        default: // 'dynamic'
            // Dynamic bodies are fully simulated, affected by forces, gravity, and collisions.
            desc = RAPIER.RigidBodyDesc.dynamic();
            break;
    }
    return desc
}


export class GravityPoint {
    constructor(name, gravityCenter = new THREE.Vector3(), isActive = true) {
        this.name = name;
        this.gravityCenter = gravityCenter; // Assumes THREE.Vector3
        this.isActive = isActive;
        this.affectedBodies = [];
    }

    activate() {
        this.isActive = true;
    }

    deactivate() {
        this.isActive = false;
    }

    /**
     * Sets the center. Can accept (x, y, z) or (Vector3).
     */
    setGravityCenter(arg1, arg2, arg3) {
        if (arg1 && arg1.isVector3) {
            // Handle Vector3 input
            this.gravityCenter.copy(arg1);
        } else if (typeof arg1 === 'number' && typeof arg2 === 'number' && typeof arg3 === 'number') {
            // Handle 3 floats input
            this.gravityCenter.set(arg1, arg2, arg3);
        } else {
            console.warn(`GravityPoint: Invalid arguments for setGravityCenter.`);
        }
    }

    /**
     * Adds bodies. Checks if valid Rapier bodies before adding.
     */
    addBodies(input) {
        // Normalize input to an array
        const bodiesToAdd = Array.isArray(input) ? input : [input];

        bodiesToAdd.forEach(body => {
            if (this._isValidRapierBody(body)) {
                // Prevent duplicates
                if (!this.affectedBodies.includes(body)) {
                    this.affectedBodies.push(body);
                }
            } else {
                console.warn(`GravityPoint: Attempted to add an invalid Rapier body to "${this.name}".`);
            }
        });
    }

    removeBody(bodyToRemove) {
        this.affectedBodies = this.affectedBodies.filter(body => body !== bodyToRemove);
    }

    emptyBodies() {
        this.affectedBodies = [];
    }

    /**
     * Internal helper to validate if an object is likely a Rapier body.
     * Rapier bodies usually have a 'handle' property (integer) and method like 'setLinvel'.
     */
    _isValidRapierBody(body) {
        return body && typeof body === 'object' && body.hasOwnProperty('handle');
    }
}