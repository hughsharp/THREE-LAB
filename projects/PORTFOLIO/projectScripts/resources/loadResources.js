import * as THREE from 'three';
import { gltfLoader, rgbeLoader, textureLoader, dracoLoader, handleProgress, registerFile } from '../../configs/setupLoaders.js';

const roomGLB = 'allstars.glb';
const roomHDR = 'peppermint_powerplant_2_1k.hdr';
const heroGLB = 'josh-wave5.glb'
const avatarGLB = 'avatar1.glb'
// const sprite = 'spriteX2.webp'
const sprite = 'spark1.png'
const spriteSheet = 'spritex256.webp'
async function loadResources() {
    const resources = {
        roomModel: null,
        heroModel: null,
        avatarModel: null,
        environmentMap: null,
        textures: [],
        sprite: null
    };

    // Register files for precise progress scaling
    registerFile(roomGLB);
    registerFile(roomHDR);

    const loadGLTF = new Promise((resolve) => {
        // Resolve immediately if logic is commented out, otherwise it waits forever!
        // resolve();
        gltfLoader.setDRACOLoader(dracoLoader);
        gltfLoader.load(
            './models/' + roomGLB,
            (gltf) => {
                resources.roomModel = gltf;

                // --- Animation Setup (Moved from addModel.js) ---
                const mixer = new THREE.AnimationMixer(gltf.scene);
                gltf.mixer = mixer;
                gltf.heroClips = [];
                gltf.activeAction = null;

                gltf.animations.forEach((clip) => {
                    const action = mixer.clipAction(clip);
                    switch (clip.name) {
                        // bang desk, idle sit to type, sit clap, sit point, sit to stand clap, sit to stand, type to idle sit
                        case "bangingFist":
                        case "gangnam":
                        case "robotDance":
                        case "sitToStand":
                        case "sitToType":
                        case "standClap":
                        case "standToSit":
                        case "tpose":
                        case "waving":
                            // Do nothing (don't play yet)
                            gltf.heroClips.push(clip);
                            break;
                        case "typing":
                            // action.setLoop(THREE.LoopPingPong);
                            gltf.heroClips.push(clip);
                            action.play();
                            gltf.activeAction = action;
                            break;
                        default:
                            action.play();
                            break;
                    }
                });
                // ------------------------------------------------

                resolve();
            },
            (xhr) => {
                handleProgress(roomGLB, xhr.loaded, xhr.total);
            }
        );
    });


    const loadHeroModel = new Promise((resolve) => {
        gltfLoader.setDRACOLoader(dracoLoader);
        gltfLoader.load(
            './models/' + heroGLB,
            (gltf) => {
                resources.heroModel = gltf;
                resolve();
            },
            (xhr) => {
                handleProgress(heroGLB, xhr.loaded, xhr.total);
            }
        );
    });

    const loadAvatarModel = new Promise((resolve) => {
        gltfLoader.setDRACOLoader(dracoLoader);
        gltfLoader.load(
            './models/' + avatarGLB,
            (gltf) => {
                resources.avatarModel = gltf;
                resolve();
            },
            (xhr) => {
                handleProgress(avatarGLB, xhr.loaded, xhr.total);
            }
        );
    });

    const loadHDR = new Promise((resolve) => {
        rgbeLoader.load(
            './textures/' + roomHDR,
            (texture) => {
                resources.environmentMap = texture;
                texture.mapping = THREE.EquirectangularReflectionMapping;
                resolve();
            },
            (xhr) => {
                handleProgress(roomHDR, xhr.loaded, xhr.total);
            }
        );
    });

    //add a loader for sprite
    const loadSprite = new Promise((resolve) => {
        textureLoader.load(
            './textures/' + sprite,
            (texture) => {
                resources.sprite = texture;
                resolve();
            },
            (xhr) => {
                handleProgress(sprite, xhr.loaded, xhr.total);
            }
        );
    });

    //add loader for spriteSheet
    const loadSpriteSheet = new Promise((resolve) => {
        textureLoader.load(
            './textures/' + spriteSheet,
            (texture) => {
                resources.spriteSheet = texture;
                resolve();
            },
            (xhr) => {
                handleProgress(spriteSheet, xhr.loaded, xhr.total);
            }
        );
    });
    await Promise.all([loadGLTF, loadAvatarModel, loadHDR, loadSprite, loadSpriteSheet, loadHeroModel]);
    return resources;
}


export const resources = await loadResources();
console.log(resources)