import * as THREE from 'three';
import { resources } from './loadResources.js';

export function adjustObjects(scene, progressText) {
    if (progressText) progressText.innerText = "Configuring Materials...";

    return new Promise((resolve) => {
        // Inner Helper to apply logic once texture is ready
        const applyConfiguration = (envTexture) => {
            const objectMap = new Map();
            scene.traverse((obj) => {
                if (obj.name) objectMap.set(obj.name, obj);
            });

            const materialConfigs = [
                {
                    name: ["screenDisplay001_1"],
                    envMapIntensity: 10, metalness: 0.1, roughness: 0.5,
                    envMapRotation: new THREE.Euler(0, 0.5, 0.5)
                },
                { name: "Object_0003_3", envMapIntensity: 1, metalness: 0, roughness: 0.32, envMapRotation: new THREE.Euler(0, Math.PI / 2, 0) }, //CHAIR
                { name: "Object_0002", envMapIntensity: 3, metalness: 0, roughness: 0.1 },
                { name: "shelf", envMapIntensity: 1.65, metalness: 0., roughness: 1, envMapRotation: new THREE.Euler(1.2, 0.1, 0.2), side: THREE.BackSide, toneMapped: false },
                { name: "mjolnir_low_mjolnir_hammer_0", envMapIntensity: 5, metalness: 1, roughness: 1, },
                { name: "Object_15", envMapIntensity: 20, metalness: 0.15, roughness: 0.5, }, // DESK FACE
                { name: "Object_15001", envMapIntensity: 2, metalness: 0.15, roughness: 0.2, envMapRotation: new THREE.Euler(Math.PI, -Math.PI / 2, -1) }, // DESK STAND

                { name: "book001", envMapIntensity: 20, metalness: 0.15, roughness: 1, envMapRotation: new THREE.Euler(Math.PI / 2, Math.PI / 2, 0) },
                // { name: ["Object_12001", "Circle004_0"], envMapIntensity: 2.2 },
                { name: "Object_12001", envMapIntensity: 0.75, envMapRotation: new THREE.Euler(0, 1, 0), toneMapped: false },
                { name: "Object_108", envMapIntensity: 1 },
                { name: "leftWallFoot001", envMapIntensity: 0.5 },
                { name: "Object_17", envMapIntensity: 0.5 },

                { name: "PokeBall__0002" },
                { name: "PokeBall__0002_1" },
                { name: "PokeBall__0002_2" },

                { name: "PokeBall__0003" },
                { name: "PokeBall__0003_1" },
                { name: "PokeBall__0003_2" },

                { name: "pillow-small-2", envMapIntensity: 0.3 },
                { name: "pillow-small-1", envMapIntensity: 0.3 },


                { name: "Object_8001" },
                { name: "aegis", envMapIntensity: 5 },
                { name: "questionCube", envMapIntensity: 5, metalness: 0, roughness: 0 },
                { name: "Object_34001", envMapIntensity: 10, metalness: 0, roughness: 0.7, side: THREE.BackSide },
                { name: "Object_32", envMapIntensity: 2.5 },
                { name: "Object_31", envMapIntensity: 5, envMapRotation: new THREE.Euler(Math.PI, 0, 0) },
                { name: "Object_33", envMapIntensity: 2, envMapRotation: new THREE.Euler(Math.PI, 0, 0), roughness: 0 },
                { name: "Object_42001", envMapIntensity: 6 },
                { name: "Object_40001", envMapIntensity: 15, roughness: 0 },
                { name: "bedMain", envMapIntensity: 0.15, roughness: 1, envMapRotation: new THREE.Euler(Math.PI, Math.PI, Math.PI) },
                { name: "bedStand", envMapIntensity: 0.9, roughness: 1 },

                { name: "Object_0007", toneMapped: false, envMapIntensity: 0.4 }, //caseCover

                //Blackhole
                { name: "Lathe_S_Blackhole_01_0", toneMapped: false, emissiveIntensity: 0.7 },

                //DRONE PARTS
                { name: "Circle_0", envMapIntensity: 3.5, roughness: 0.1 },
                { name: "Cube_1", envMapIntensity: 1.5, roughness: 0.1 },
                { name: "Circle002_0", envMapIntensity: 6, roughness: 0.1 },
            ];

            materialConfigs.forEach(config => {
                const names = Array.isArray(config.name) ? config.name : [config.name];
                names.forEach(name => {
                    const obj = objectMap.get(name);
                    if (obj && obj.material) {
                        obj.material.envMap = envTexture;
                        // obj.material.needsUpdate = true;
                        const { name: _, ...props } = config;
                        Object.assign(obj.material, props);
                    }
                });
            });

            scene.isAdjusted = true;
            resolve();
        };

        // Fix Double HDR Load: Check if Main.js already loaded it
        if (resources.environmentMap) {
            applyConfiguration(resources.environmentMap);
        } else if (scene.environment) {
            applyConfiguration(scene.environment);
        } else {
            console.warn("Resources: Environment Map not loaded.");
            // Fallback or skip
            // rgbeLoader.load... (Removed to use concentrated loading)
        }
    });
}
