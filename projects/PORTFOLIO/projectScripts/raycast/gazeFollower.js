import * as THREE from 'three';
import TWEEN from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/libs/tween.module.min.js';


/**
 * Class: GazeFollower
 * -------------------
 * A controller that makes a 3D object smoothly rotate to look at a target
 * using spherical interpolation (SLERP). 
 * * Features:
 * - Handles nested parent hierarchies (World Space vs Local Space).
 * - Interrupts active tweens smoothly if a new target is selected.
 * - Uses Tween.js for animation control.
 */
export class GazeFollower {
    /**
     * @param {THREE.Mesh} mesh - The object that will perform the rotation (The Probe).
     */
    constructor(mesh) {
        this.mesh = mesh;
        
        // The dummy is our invisible calculator. 
        // We don't attach it yet; we wait for init().
        this.dummy = new THREE.Object3D();
        
        this.startQuaternion = new THREE.Quaternion();
        this.targetQuaternion = new THREE.Quaternion();
        this.targetWorldPos = new THREE.Vector3();
        
        this.activeTween = null;
        this.isInitialized = false;
    }

    /**
     * INTRODUCTION / SETUP
     * Call this ONLY after 'this.mesh' has been added to the scene/parent.
     * This attaches the dummy helper to the same parent as the mesh.
     */
    init() {
        if (!this.mesh.parent) {
            console.error("GazeFollower Error: Probe mesh has no parent. Add it to the scene before calling init().");
            return;
        }

        // Attach dummy to the same parent so they share the local coordinate space
        this.mesh.parent.add(this.dummy);
        
        // Sync initial state
        this.dummy.position.copy(this.mesh.position);
        this.dummy.rotation.copy(this.mesh.rotation);
        this.dummy.scale.copy(this.mesh.scale);
        
        this.isInitialized = true;
    }

    /**
     * Rotates the probe to look at the target object.
     * @param {THREE.Object3D} targetObject - The object to track.
     */
    lookAtTarget(targetObject) {
        if (!this.isInitialized) {
            console.warn("GazeFollower: calling lookAtTarget before init()");
            return;
        }

        // 1. Interrupt existing animation
        if (this.activeTween) {
            this.activeTween.stop();
        }
        
        // 2. Sync Dummy Position with Mesh (in case Mesh moved)
        this.dummy.position.copy(this.mesh.position);
        this.dummy.scale.copy(this.mesh.scale); // Scale affects rotation matrices

        // 3. Calculate World Position of the target
        targetObject.getWorldPosition(this.targetWorldPos);

        // 4. Look at World Position (Dummy converts this to Local Rotation)
        this.dummy.lookAt(this.targetWorldPos);
        
        // 5. Capture Rotations
        this.targetQuaternion.copy(this.dummy.quaternion);
        this.startQuaternion.copy(this.mesh.quaternion);

        // 6. Animate
        const values = { t: 0 };
        let quat = new THREE.Quaternion()

        if (this.mesh.rapierBody){
            this.activeTween = new TWEEN.Tween(values)
                .to({ t: 1 }, 1500)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onUpdate(() => {
                    quat.copy(this.startQuaternion).slerp(this.targetQuaternion, values.t);
                    this.mesh.rapierBody.setRotation(quat)
                })
                .onComplete(() => {
                    this.activeTween = null;
                })
                .start();
        } else {
            this.activeTween = new TWEEN.Tween(values)
                .to({ t: 1 }, 1500)
                .easing(TWEEN.Easing.Quadratic.Out)
                .onUpdate(() => {
                    this.mesh.quaternion.copy(this.startQuaternion).slerp(this.targetQuaternion, values.t);
                })
                .onComplete(() => {
                    this.activeTween = null;
                })
                .start();
        }

        
    }
    
    /**
     * Cleanup method to remove the dummy helper if the probe is destroyed
     */
    dispose() {
        if (this.dummy.parent) {
            this.dummy.parent.remove(this.dummy);
        }
    }
}

// // --- Usage Example ---

// // 1. Create Mesh and Class
// const probeMesh = new THREE.Mesh(geo, mat);
// const gazeFollower = new GazeFollower(probeMesh);

// // 2. Add Mesh to Scene (Essential!)
// scene.add(probeMesh);

// // 3. Initialize the Class (The "Introduction")
// gazeFollower.init(); // Now the dummy attaches correctly to 'scene'

// // 4. Use it
// // gazeFollower.lookAtTarget(someTarget);