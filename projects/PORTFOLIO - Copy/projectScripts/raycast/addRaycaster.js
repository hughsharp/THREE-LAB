import * as THREE from 'three';
import * as CONSTANTS from '../constant.js';

// --- Material Definitions ---
export const goldInnerGlowMatSkinned = CONSTANTS.createInnerGlowMatSkinned("#FBC189", 1.5, 1, THREE.FrontSide); 

export class Raycaster {
    constructor(scene, camera, renderer, size = 32) {
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        this.domElement = scene.domElement;
        
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        scene.raycasterWrapper = this;
        
        // Placeholder materials for highlight
        const POOL_SIZE = 10;
        this.raycastHightlightMaterials = [];
        for (let i = 0; i < POOL_SIZE; i++) {
            let mat = new THREE.MeshStandardMaterial({ name: `Pool_Mat_${i}` });
            this.raycastHightlightMaterials.push(mat);
        }

        // --- Dynamic Element Creation ---
        const informer = document.createElement('div');
        informer.id = 'cursor-informer';
        document.body.appendChild(informer);
        this.cursorInformer = informer; 
        scene.cursorInformer = this.cursorInformer;
        this.iconSize = size;

        this.isHoveringRaycastObject = false;

        // --- State Variables ---
        this.currentHoveredGroup = null;
        this.originalMaterialsMap = new Map();
        this.currentIntersection = null;
        this.currentObject = null;
        this.currentObjectTarget = null;
        this.lastObjectTarget = null;

        // --- 1. BIND EVENTS ONCE ---
        this._onPointerMove = this.onPointerMove.bind(this);
        this._onMouseDown = this.onMouseDown.bind(this);
        this._updateGravityCenter = this.updateGravityCenter.bind(this);
        this._onKeyDown = this.onKeyDown.bind(this);

        // --- 2. ADD LISTENERS ---
        this.domElement.addEventListener('pointermove', this._onPointerMove);
        this.domElement.addEventListener('mousedown', this._onMouseDown, false);
        this.domElement.addEventListener('mousemove', this._updateGravityCenter);
        window.addEventListener('keydown', this._onKeyDown);
    }

    // --- Event Handlers ---
    
    onKeyDown(event) {
        if (event.key === 'r' || event.key === 'R') {
            console.log('--- Debug: Raycaster ---');
            console.log('THREE.Raycaster:', this.raycaster);
            console.log('Raycaster Wrapper:', this);
            
            // --- Log State Variables ---
            console.group('State Variables'); // Optional: groups these logs cleanly
            console.log('currentHoveredGroup:', this.currentHoveredGroup);
            console.log('originalMaterialsMap:', this.originalMaterialsMap);
            console.log('currentIntersection:', this.currentIntersection);
            console.log('currentObject:', this.currentObject);
            console.log('currentObjectTarget:', this.currentObjectTarget);
            console.log('lastObjectTarget:', this.lastObjectTarget);
            console.groupEnd();
        }
    }

    onMouseEnter(){
        console.log('Entered something')
        // console.group('Wrapper CALL'); // Optional: groups these logs cleanly
        //     console.log('currentHoveredGroup:', this.currentHoveredGroup);
        //     console.log('originalMaterialsMap:', this.originalMaterialsMap);
        //     console.log('currentIntersection:', this.currentIntersection);
        //     console.log('currentObject:', this.currentObject);
        //     console.log('currentObjectTarget:', this.currentObjectTarget);
        //     console.log('lastObjectTarget:', this.lastObjectTarget);
        //     console.groupEnd();
    }

    onPointerMove(event) {
        const rect = this.domElement.getBoundingClientRect();
        const offsetX = this.iconSize * -0.5;
        const offsetY = this.iconSize * -1.5;
        const finalX = event.clientX + offsetX;
        const finalY = event.clientY + offsetY;

        // Update pointer vector for raycasting
        const localX = event.clientX - rect.left;
        const localY = event.clientY - rect.top;
        this.pointer.x = (localX / rect.width) * 2 - 1;
        this.pointer.y = - (localY / rect.height) * 2 + 1;

        if (this.cursorInformer) {
            this.cursorInformer.style.translate = `${finalX}px ${finalY}px`;
        }
    }

    onMouseDown(event) {
        if (this.currentIntersection) {
            this.currentObjectTarget?.onMouseDown?.(this.currentObjectTarget, this.currentIntersection);
        }
    }

    onMouseLeave(event) {
        if (this.currentIntersection) {
            this.currentObjectTarget?.onMouseLeave?.(this.currentObjectTarget, this.currentIntersection);
        }
    }

    updateGravityCenter(event) {
        // Assuming scene.world.gravityCenterForBalls exists
        if(this.scene.world && this.scene.world.gravityCenterForBalls) {
             const fixedDistance = 20;
             this.raycaster.ray.at(fixedDistance, this.scene.world.gravityCenterForBalls);
             this.scene.world.gravityCenterForBalls.x += 2;
        }
    }

    updateInformer(image) {
        if (this.cursorInformer) {
            this.cursorInformer.style.backgroundImage = `url('${image}')`;
        }
    }

    update() {
        if (!this.scene.raycastObjects || this.scene.raycastObjects.length === 0) return;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObjects(this.scene.raycastObjects, true);

        if (intersects.length > 0) {
            this.cursorInformer.style.opacity = '1'; 

            this.currentIntersection = intersects[0]; 
            this.currentObject = intersects[0].object.ignoreRaycast ? intersects[0].object.parent : intersects[0].object;
            const parentGroup = this.currentObject.parent;

            if (this.currentObject.parent && this.currentObjectTarget !== parentGroup) {
                this.currentObjectTarget = parentGroup.isScene ? this.currentObject : parentGroup;
                
                // 1. Enter/Leave Logic (Runs ONCE per target switch)
                if (this.lastObjectTarget !== this.currentObjectTarget) {
                    
                    this.lastObjectTarget?.onMouseLeave?.()
                    this.currentObjectTarget?.onMouseEnter?.();
                    
                } 
            }

            // 2. Continuous Hover Logic (Runs EVERY FRAME while hovering)
            // Passes 1 argument: the target object
            if (this.currentObjectTarget) {
                this.currentObjectTarget.onMouseHover?.(this.currentObjectTarget);
            }
            
        } else if (this.currentObjectTarget) {
            // Mouse left the object completely
            this.isHoveringRaycastObject = false;
            this.currentObjectTarget?.onMouseLeave?.();
            this.currentObjectTarget = null;
            this.currentIntersection = null; 
            this.currentObject = null;
        }

        this.lastObjectTarget = this.currentObjectTarget;
    }

    dispose() {
        if (this.domElement) {
            this.domElement.removeEventListener('pointermove', this._onPointerMove);
            this.domElement.removeEventListener('mousedown', this._onMouseDown, false);
            this.domElement.removeEventListener('mousemove', this._updateGravityCenter);
        }
        window.removeEventListener('keydown', this._onKeyDown);

        if (this.cursorInformer && this.cursorInformer.parentNode) {
            this.cursorInformer.parentNode.removeChild(this.cursorInformer);
        }
        
        this.cursorInformer = null;
        if (this.scene) {
            this.scene.cursorInformer = null;
            this.scene.raycaster = null;
        }
        console.log('Raycaster disposed');
    }
}

// --- Utility Functions ---

export function addRaycastObject(scene, object, onMouseEnter, onMouseLeave, onMouseDown, onMouseHover){
    scene.raycastObjects = scene.raycastObjects || [];
    scene.raycastObjects.push(object);
    let objectTarget = object.parent.isScene? object : object.parent;
    
    // Store original material on traverse
    objectTarget.traverse( (child)=>{
        if (child.material) child.userData.originalMaterial = child.material
    })
    
    // Attach custom event handlers to the object
    objectTarget.onMouseEnter = () => onMouseEnter && onMouseEnter(objectTarget);
    objectTarget.onMouseLeave = () => onMouseLeave && onMouseLeave(objectTarget);
    
    // UPDATED: Continuous hover handler
    if (onMouseHover) {
        objectTarget.onMouseHover = (target) => onMouseHover(target);
    }

    if (onMouseDown) {
        objectTarget.onMouseDown = (target, intersection) => onMouseDown(target, intersection);
    }
}

export function highlightObject(scene, object) {
    restoreMaterials(scene)
    const POOL_SIZE = 10;

    // 1. Initialize the Fixed Material Pool
    if (!scene.raycastMaterials) {
        scene.raycastMaterials = [];
        for (let i = 0; i < POOL_SIZE; i++) {
            const mat = new THREE.MeshStandardMaterial({ name: `Pool_Mat_${i}` });
            scene.raycastMaterials.push(mat);
        }
    }

    // 2. Analyze the object
    const materialUsageMap = new Map();
    
    object.traverse((child) => {
        if (child.ignoreRaycast) return;

        if (child.isMesh && child.material) {
            // Safety Check: Skip Shaders
            if (child.material.isShaderMaterial) return;
            
            if (!child.userData.originalMaterial) {
                child.userData.originalMaterial = child.material;
            }
            const uuid = child.material.uuid;
            
            if (!materialUsageMap.has(uuid)) {
                materialUsageMap.set(uuid, { count: 0, material: child.material });
            }
            const entry = materialUsageMap.get(uuid);
            entry.count++;
        }
    });

    // 3. Sort materials by frequency
    const sortedMaterials = Array.from(materialUsageMap.values())
        .sort((a, b) => b.count - a.count);

    // 4. Map original UUIDs to Pool Materials
    const activeMapping = new Map();
    const limit = Math.min(sortedMaterials.length, POOL_SIZE);

    for (let i = 0; i < limit; i++) {
        const originalMat = sortedMaterials[i].material;
        const poolMat = scene.raycastMaterials[i];

        poolMat.copy(originalMat);
        if (originalMat.toneMapped === false){
            console.log('already de-tonemapped', originalMat)
            // poolMat.emissiveColor.set(1,0,0)
            poolMat.envMap = originalMat.envMap? originalMat.envMap : scene.environment
            poolMat.envMapIntensity = originalMat.envMap? originalMat.envMapIntensity * 4 : 4
        } else {
            poolMat.toneMapped = false;
        }
        
        
        activeMapping.set(originalMat.uuid, poolMat);
    }

    // 5. Apply the pooled materials
    object.traverse((child) => {
        if (child.ignoreRaycast) return;
        
        if (child.isMesh && child.material) {
            const replacementMat = activeMapping.get(child.material.uuid);

            if (replacementMat) {
                child.material = replacementMat;
            }
        }
    });
}

export function changeMaterial(child, newMaterial = goldInnerGlowMatSkinned){
    child.traverse( (d)=>{
        if (d.ignoreRaycast) return;
        if (d.material) {
            if (!d.userData.originalMaterial) {
                d.userData.originalMaterial = d.material;
            }
            d.material = newMaterial;
        }
    })
}

export function restoreMaterials(scene){
    scene.raycastObjects.forEach(object => {
        object.traverse( (d)=>{
            if (d.material && d.userData.originalMaterial) {
                d.material = d.userData.originalMaterial;
            }
        });
    });
}

export function applyImpulse(scene, bodyHostingObject, intersection, forceMultiplier = null){
    const rapierBody = bodyHostingObject.rapierBody;
    const intersectPoint = intersection.point;
    const forceDirection = new THREE.Vector3();
    forceDirection.subVectors(intersectPoint, scene.raycasterWrapper.camera.position).normalize();

    const mass = rapierBody.mass()|| 0;
    forceMultiplier = forceMultiplier || Math.random() * 1 + 2.5;
    const forceMagnitude = mass * forceMultiplier;
    const impulse = forceDirection.multiplyScalar(forceMagnitude);
    
    impulse.y = Math.max(2 * Math.abs(forceDirection.y), 2);
    impulse.x /= 10;
    impulse.y *= 3;
    impulse.z /= 10;
    
    rapierBody.applyImpulseAtPoint(impulse, intersectPoint, true); 
}

export function adjustNebula(scene){
    const A = scene.raycasterWrapper.pointer
    const P = new THREE.Vector2(0.0, 0.29); 
    const dist = A.distanceTo(P); 
    
    if (dist === 0.0) {
        return 2; 
    } else if (dist > 0.39) {
        scene.constantUniform.nebulaCoreRadius.value = 40; 
        scene.constantUniform.nebulaTwistFactor.value = 0
    } else {
        const t = dist / 0.39; 
        const easedT = t * t; 
        scene.constantUniform.nebulaCoreRadius.value = 2 + (100 - 2) * easedT; 
        
        const sourceMax = 0.2;
        const clampedEasedT = Math.max(0, Math.min(easedT, sourceMax));
        const normalizedT = clampedEasedT / sourceMax;
        
        scene.constantUniform.nebulaTwistFactor.value = 1 - normalizedT;
    }
    return dist
}