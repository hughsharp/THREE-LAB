import * as THREE from 'three';
import * as ARAP from '../rapierPhysics/addRapierWorld.js';

export function bindPhysics(scene, progressText) {
    if (progressText) progressText.innerText = "Calculating Physics...";
    return new Promise((resolve, reject) => {
        scene.bhTargets ||= [];
        const objectMap = new Map();
        scene.traverse((obj) => { if (obj.name) objectMap.set(obj.name, obj); });

        function specifyBinding(names, func, options = {}) {
            const targets = Array.isArray(names) ? names : [names];
            for (let name of targets) {
                let m = objectMap.get(name);
                if (!m) continue;
                if (options.isBhTarget) scene.bhTargets.push(m);
                let bodyShape = func(scene, m, options);
                ARAP.bindBodyObject(scene, m, bodyShape.body, bodyShape.shape, options);
            }
        }

        specifyBinding([
            'backWall_rapier', 'rightWall', 'leftWall', 'glass2', 'frontWall',
            '', 'Object_15', 'Object_15001', 'Cube004', 'Cube019_3',
            'Cube019_5', "Object_1001_1", "bedMain", "bedStand", 'Object_8001', "leftWallFoot001"
        ], ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'fixed' });



        specifyBinding("glassInvi", ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'kinematicPosition' })

        specifyBinding('Object_31', ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', restitution: 0.2, mass: 50, pullingDampness: 0.5, canSleep: true, isBhTarget: true, isConvexHull: true }) //LAPTOP
        specifyBinding('pictureLionFrame', ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', restitution: 0.2, mass: 1, pullingDampness: 0.0025, canSleep: true, isBhTarget: true, isConvexHull: true }) //PICTURE FRAME
        specifyBinding('Model_0001', ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', restitution: 0.1, mass: 1.5, pullingDampness: 0.0025, canSleep: true, isBhTarget: true, isConvexHull: true }) //PICTURE FRAME 2



        // specifyBinding("caseCover", ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', mass: 400, restitution: 0.3, canSleep: true, isBhTarget: true,  pullingDampness: 0.25 }) // SHELF

        specifyBinding('Object_12001', ARAP.getBodyShapeByBoundingBox, { bodyType: 'fixed', scale: new THREE.Vector3(1, 1, 0.5), offset: new THREE.Vector3(0, 0.5, 0) }) //black cat

        specifyBinding('Object_108', ARAP.getBodyShapeByBoundingBox, { bodyType: 'kinematicPosition', scale: new THREE.Vector3(2, 1, 1) }) //whiteCat
        specifyBinding("Object_2001", ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', mass: 80, restitution: 0.3, canSleep: true, isBhTarget: true, yOffset: -0.1, pullingDampness: 0.45 }) // CHAIR
        specifyBinding("mjolnir_low_mjolnir_hammer_0", ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', mass: 10, restitution: 0.0, canSleep: true, isBhTarget: true, pullingDampness: 0.9075, isConvexHull: true }) // MJOLNIR
        specifyBinding('questionCube', ARAP.getBodyShapeByBoundingBox, { bodyType: 'dynamic', isBhTarget: true });
        specifyBinding("shelf", ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', mass: 400, restitution: 0.3, canSleep: true, isBhTarget: true, pullingDampness: 0.25 }) // SHELF

        let books = []
        for (let i = 0; i <= 38; i++) {
            const bookName = "book" + String(i).padStart(3, "0");
            books.push(bookName);
        }

        specifyBinding(books, ARAP.getBodyShapeByBoundingBox, { bodyType: 'dynamic', isBhTarget: true, mass: 2, restitution: 0.35, canSleep: true, pullingDampness: 0.25 });
        specifyBinding(['pokeball', 'pokeball2'], ARAP.getBodyShapeByBoundingSphere, { bodyType: 'dynamic', mass: 0.9, scale: 0.5, restitution: 0.8, isBhTarget: true });

        specifyBinding('drone', ARAP.getBodyShapeByBoundingBox, { bodyType: 'kinematicPosition', mass: 2.5, isBhTarget: true, linearDamping: 1, angularDamping: 1 });

        setTimeout(() => {
            try {
                specifyBinding('caseCover', ARAP.getBodyShapeByBoundingBox, { bodyType: 'dynamic', mass: 100, restitution: 0.1, isBhTarget: true }) //PC case

                specifyBinding("Object_42001", ARAP.getBodyShapeByBoundingBox, { bodyType: 'dynamic', mass: 0.5, restitution: 0.93, canSleep: true, isBhTarget: true, pullingDampness: -1 }) //mouse

                specifyBinding("Object_38001", ARAP.getBodyShapeByBoundingBox, { bodyType: 'dynamic', mass: 0.5, restitution: 0.7, canSleep: true, isBhTarget: true, pullingDampness: 0 }) // keyboard

                specifyBinding('screenDisplay', ARAP.getBodyShapeByBoundingBox, { bodyType: 'dynamic', mass: 200, scale: new THREE.Vector3(1, 1.05, 1), offset: new THREE.Vector3(0, -0.13, 0), isBhTarget: true, pullingDampness: 1 }) //monitor

                specifyBinding(['aegis', 'aegis2'], ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', mass: 1.1, restitution: 0.01, canSleep: true, isBhTarget: true, isConvexHull: true });

                specifyBinding(['pillow-small-1', 'pillow-small-2', 'pillow-big-1', 'pillow-big-2'], ARAP.getFreeFormBodyShapeFromMesh, { bodyType: 'dynamic', mass: 100.3, restitution: 0.0, friction: 0.9, canSleep: true, pullingDampness: 0.64, isBhTarget: true, isConvexHull: true });

                resolve();
            } catch (e) {
                reject(e);
            }
        }, 750);
    });
}
