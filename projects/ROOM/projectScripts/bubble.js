import * as THREE from 'three';
import * as CONSTANTS from './constant.js';
import { fetchTopProducts } from './fetchProducts.js';
import { BasicGeometries } from '../configs/setupGeometries.js'; // Basic geometries for the scene
import { constantUniform } from './addConstantUniform.js';
import RAPIER from './rapier3d-compat.js';
import { bindBodyObject } from './addRapierWorld.js';

/**
 * --- NEW FUNCTION ---
 * Creates and manages the loading screen and the THREE.LoadingManager.
 * @returns {THREE.LoadingManager} The configured loading manager.
 */
function setupLoadingManager() {
    const loadingScreen = document.createElement('div');
    
    // --- Styles for the loading screen ---
    loadingScreen.style.position = 'absolute';
    loadingScreen.style.top = '0';
    loadingScreen.style.left = '0';
    loadingScreen.style.width = '100%';
    loadingScreen.style.height = '100%';
    loadingScreen.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
    loadingScreen.style.display = 'flex';
    loadingScreen.style.justifyContent = 'center';
    loadingScreen.style.alignItems = 'center';
    loadingScreen.style.color = 'white';
    loadingScreen.style.fontSize = '24px';
    loadingScreen.style.zIndex = '999';
    loadingScreen.style.transition = 'opacity 0.5s ease'; // For smooth fade-out
    loadingScreen.innerHTML = 'Loading Products...';
    document.body.appendChild(loadingScreen);

    const manager = new THREE.LoadingManager();

    // On load, fade out the screen and then hide it
    manager.onLoad = function () {
        loadingScreen.style.opacity = '0';
        loadingScreen.addEventListener('transitionend', () => {
            loadingScreen.style.display = 'none';
        });
    };

    // On error, display an error message
    manager.onError = function (url) {
        console.error('There was an error loading ' + url);
        loadingScreen.innerHTML = 'Error loading assets. Please refresh.';
    };

    return manager;
}


// --- REFACTORED: Call the function to get the loading manager ---
// const loadingManager = setupLoadingManager();

// This material is now for the solid white base cube
const cubeMaterial = new THREE.MeshLambertMaterial({
    color: "white",
});

// Use BoxGeometry for the cube shape
let geo = new THREE.BoxGeometry(1, 1, 1);
let planeGeo = new THREE.PlaneGeometry(1, 1); // Geometry for the faces
// Pass the loading manager to the texture loader
let textureLoader

const products = await fetchTopProducts();

export class Bubbles {
    constructor(scene) {
        // adjustTheme(scene)
        const loadingManager = setupLoadingManager();
        textureLoader = new THREE.TextureLoader(loadingManager);
        this.scene = scene;
        this.bubbles = []; // Keep track of cubes

        // --- Tooltip and Raycasting Setup ---loadingManager
        this.tooltip = this.createTooltip();
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.currentIntersected = null;
        // We assume the renderer's DOM element is available to attach events
        const rendererElement = document.querySelector('canvas') || scene.renderer.domElement;
        if (rendererElement) {
            this.rendererElement = rendererElement;
            rendererElement.addEventListener('mousemove', this.onMouseMove.bind(this));
            rendererElement.addEventListener('click', this.onClick.bind(this));
        }


        // 1. Find the min and max vote counts to establish a range.
        let minVotes = Infinity;
        let maxVotes = -Infinity;
        products.forEach(p => {
            if (p.votesCount < minVotes) minVotes = p.votesCount;
            if (p.votesCount > maxVotes) maxVotes = p.votesCount;
        });

        // Define a wider visual size range for more visible differences.
        let multiplier = 0.15
        let minSize = 2;
        let maxSize = 5;
        minSize *= multiplier;
        maxSize *= multiplier;



        let productIndex = 0;
        const createNextBubble = () => {
            // Stop if we've processed all products or reached the limit of 10
            if (productIndex >= products.length || productIndex > 10) {
                return;
            }

            const product = products[productIndex];
            const i = productIndex;

            // Calculate cube size using normalization and linear interpolation
            const voteRange = maxVotes - minVotes;
            const normalizedVotes = voteRange > 0 ? (product.votesCount - minVotes) / voteRange : 0;
            const size = minSize + normalizedVotes * (maxSize - minSize);


            // Define the initial position before creating the cube
            const initialPosition = new THREE.Vector3(
                (Math.random() - .5) * 10,
                i * 5 + 30,
                (Math.random() - 0.5) * 10
            );

            // Pass the full product object to associate data with the mesh
            let bubble = createBubble(scene, size, product, initialPosition);
            bubble.name = `bubble_${i}`;
            
            this.bubbles.push(bubble);

            productIndex++;
            
            // Use setTimeout to add a 0.5s delay
            setTimeout(createNextBubble, 500);
        };

        // Start the non-blocking creation process
        createNextBubble();

        this.constantUniform = constantUniform;
    }

    // --- Method to create the tooltip element ---
    createTooltip() {
        const tooltip = document.createElement('div');
        tooltip.style.position = 'absolute';
        tooltip.style.visibility = 'hidden';
        tooltip.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        tooltip.style.color = 'white';
        tooltip.style.padding = '8px';
        tooltip.style.borderRadius = '4px';
        tooltip.style.pointerEvents = 'none'; // So it doesn't interfere with raycasting
        tooltip.style.fontFamily = 'Arial, sans-serif';
        tooltip.style.fontSize = '14px';
        tooltip.style.zIndex = '1000';
        document.body.appendChild(tooltip);
        return tooltip;
    }

    // --- Mouse move event handler for raycasting ---
    onMouseMove(event) {
        if (!this.scene.camera) return;

        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.scene.camera);
        const intersects = this.raycaster.intersectObjects(this.bubbles, true);

        let newIntersectedParent = null;
        if (intersects.length > 0) {
            let parentCube = intersects[0].object;
            while (parentCube.parent && !parentCube.userData.productInfo) {
                parentCube = parentCube.parent;
            }
            if (parentCube.userData.productInfo) {
                newIntersectedParent = parentCube;
            }
        }

        // --- MODIFIED: Apply impulse at the intersection point on hover ---
        if (newIntersectedParent && newIntersectedParent !== this.currentIntersected) {
            const body = newIntersectedParent.rapierBody;
            if (body) {
                body.wakeUp();

                // 1. Get the exact point of intersection from the raycast result.
                const intersectionPoint = intersects[0].point;

                // 2. Define the impulse vector.
                const impulseMultiplier = 50; 
                const impulse = new RAPIER.Vector3(
                    (Math.random() - 0.5) * 5, // A little horizontal randomness
                    impulseMultiplier,         // Main impulse is upward
                    (Math.random() - 0.5) * 5  // A little depth randomness
                );

                // 3. Apply the impulse at the specific point.
                body.applyImpulseAtPoint(impulse, intersectionPoint, true);
            }
        }
        
        this.currentIntersected = newIntersectedParent;

        if (this.currentIntersected) {
            this.rendererElement.style.cursor = 'pointer';
            const productInfo = this.currentIntersected.userData.productInfo;
            const formattedTagline = formatTagline(productInfo.tagline, 35);

            this.tooltip.style.visibility = 'visible';
            this.tooltip.innerHTML = `
                <strong>${productInfo.name}</strong><br>
                <em>${formattedTagline}</em><br>
                Votes: ${productInfo.votes.toLocaleString()}
            `;
            this.tooltip.style.left = `${event.clientX + 15}px`;
            this.tooltip.style.top = `${event.clientY + 15}px`;

        } else {
            this.rendererElement.style.cursor = 'default';
            this.tooltip.style.visibility = 'hidden';
        }
    }

    // --- Click event handler ---
    onClick(event) {
        if (!this.scene.camera) return;

        // Use the current mouse position for the raycast
        this.raycaster.setFromCamera(this.mouse, this.scene.camera);
        const intersects = this.raycaster.intersectObjects(this.bubbles, true);

        if (intersects.length > 0) {
            let intersectedObject = intersects[0].object;
            while (intersectedObject.parent && !intersectedObject.userData.productInfo) {
                intersectedObject = intersectedObject.parent;
            }

            const productInfo = intersectedObject.userData.productInfo;
            if (productInfo && productInfo.url) {
                window.open(productInfo.url, '_blank', 'noopener,noreferrer');
            }
        }
    }


    update(delta) {
        // Physics engine handles movement.
        if (this.constantUniform) {
            this.constantUniform.iTime.value += delta;
        }
    }
}

// --- Function now accepts the full 'product' object ---
function createBubble(scene, size, product, initialPosition) {
    // --- Destructure the url from the product object ---
    const { thumbnail: imgUrl, name: productName, votesCount, tagline, url } = product;
    
    const individualMaterial = cubeMaterial.clone();
    let bubbleMesh = new THREE.Mesh(geo, individualMaterial);

    // --- Store product info in the mesh's userData ---
    bubbleMesh.userData.productInfo = {
        name: productName,
        votes: votesCount,
        tagline: tagline || "No tagline available.", // Fallback for tagline
        url: url
    };
    
    bubbleMesh.position.copy(initialPosition);
    scene.add(bubbleMesh);
    bubbleMesh.scale.setScalar(size);

    // --- Add random rotation to each cube ---
    bubbleMesh.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
    );

    bubbleMesh.castShadow = true;
    bubbleMesh.receiveShadow = true;

    // Load the product texture and create 4 planes for it
    textureLoader.load(imgUrl, function (texture) {
        const dominantColor = getDominantColor(texture.image);
        bubbleMesh.material.color.set(dominantColor);
        bubbleMesh.material.needsUpdate = true;

        const imageMaterial = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        const positions = [
            { pos: [0, 0, 0.51], rot: [0, 0, 0] },
            { pos: [0, 0, -0.51], rot: [0, Math.PI, 0] },
            { pos: [0.51, 0, 0], rot: [0, Math.PI / 2, 0] },
            { pos: [-0.51, 0, 0], rot: [0, -Math.PI / 2, 0] }
        ];

        positions.forEach(p => {
            const plane = new THREE.Mesh(planeGeo, imageMaterial);
            plane.position.set(...p.pos);
            plane.rotation.set(...p.rot);
            bubbleMesh.add(plane);
        });

    }, undefined, function(err) {
        console.error('An error occurred loading the texture.', err);
    });

    const textTexture = createTextTexture(productName, votesCount, 512, 256);
    const textMaterial = new THREE.MeshBasicMaterial({ map: textTexture, transparent: true });
    
    const textPlaneTop = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), textMaterial);
    textPlaneTop.position.y = 0.51;
    textPlaneTop.rotation.x = -Math.PI / 2;
    bubbleMesh.add(textPlaneTop);

    const textPlaneBottom = new THREE.Mesh(new THREE.PlaneGeometry(1, 0.5), textMaterial);
    textPlaneBottom.position.y = -0.51;
    textPlaneBottom.rotation.x = Math.PI / 2;
    bubbleMesh.add(textPlaneBottom);


    // --- RAPIER PHYSICS SETUP (remains attached to the parent cube) ---
    const body = scene.world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
            .setTranslation(initialPosition.x, initialPosition.y, initialPosition.z)
            .setCanSleep(true)
    );
    scene.world.productBodies = scene.world.productBodies || [];

    const shape = RAPIER.ColliderDesc.cuboid(size / 2, size / 2, size / 2)
        .setRestitution(0.4)
        .setMass(getRandomFloat(10, 40));

    bubbleMesh.rapierBody = body;
    bubbleMesh.rapierShape = shape;
    body.threeMesh = bubbleMesh;
    body.rapierShape = shape;
    bindBodyObject(scene, bubbleMesh, bubbleMesh.rapierBody, bubbleMesh.rapierShape);

    return bubbleMesh;
}

/**
 * Creates a canvas texture with the given text.
 * @param {string} text The product name.
 * @param {number} votes The vote count.
 * @param {number} width The width of the canvas.
 * @param {number} height The height of the canvas.
 * @returns {THREE.CanvasTexture}
 */
function createTextTexture(text, votes, width, height) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = width;
    canvas.height = height;

    context.fillStyle = 'rgba(0, 0, 0, 0.7)';
    context.fillRect(0, 0, width, height);

    const votesText = `Votes: ${votes.toLocaleString()}`;
    const maxCharsPerLine = 12;
    const words = text.split(' ');
    let nameLines = [];
    let currentLine = words[0] || '';

    for (let i = 1; i < words.length; i++) {
        if (currentLine.length + words[i].length + 1 < maxCharsPerLine) {
            currentLine += ' ' + words[i];
        } else {
            nameLines.push(currentLine);
            currentLine = words[i];
        }
    }
    nameLines.push(currentLine);
    
    let nameFontSize = height / (nameLines.length + 2);
    const votesFontSize = nameFontSize * 0.7;

    context.textAlign = 'center';
    context.textBaseline = 'middle';
    
    const nameLineHeight = nameFontSize * 1.2;
    const votesLineHeight = votesFontSize * 1.2;
    const totalTextHeight = (nameLines.length * nameLineHeight) + votesLineHeight;
    let startY = (canvas.height - totalTextHeight) / 2;

    context.font = `bold ${nameFontSize}px Arial`;
    context.fillStyle = 'white';
    for (let i = 0; i < nameLines.length; i++) {
        const lineY = startY + (i * nameLineHeight) + (nameLineHeight / 2);
        context.fillText(nameLines[i], width / 2, lineY);
    }

    const votesY = startY + (nameLines.length * nameLineHeight) + (votesLineHeight / 2);
    context.font = `normal ${votesFontSize}px Arial`;
    context.fillStyle = '#cccccc';
    context.fillText(votesText, width / 2, votesY);


    return new THREE.CanvasTexture(canvas);
}


function getRandomFloat(min, max) {
    return Math.random() * (max - min) + min;
}

/**
 * Formats a long string by inserting line breaks.
 * @param {string} text The string to format.
 * @param {number} maxLength The maximum length of a line.
 * @returns {string} The formatted string with <br> tags.
 */
function formatTagline(text, maxLength) {
    if (!text) return "No tagline available.";
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';

    words.forEach(word => {
        if ((currentLine + ' ' + word).trim().length > maxLength) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = currentLine ? currentLine + ' ' + word : word;
        }
    });
    lines.push(currentLine);

    return lines.join('<br>');
}


/**
 * Analyzes an image and returns the most dominant color.
 * @param {HTMLImageElement} img The image element to analyze.
 * @returns {string} The dominant color as a hex string.
 */
function getDominantColor(img) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const size = 16;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    const data = imageData.data;
    const colorCount = {};
    let maxCount = 0;
    let dominantColor = { r: 255, g: 255, b: 255 };

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        if (a < 125 || (r > 250 && g > 250 && b > 250) || (r < 10 && g < 10 && b < 10)) {
            continue;
        }

        const color = `${r},${g},${b}`;
        colorCount[color] = (colorCount[color] || 0) + 1;

        if (colorCount[color] > maxCount) {
            maxCount = colorCount[color];
            dominantColor = { r, g, b };
        }
    }

    const toHex = c => ('0' + c.toString(16)).slice(-2);
    return `#${toHex(dominantColor.r)}${toHex(dominantColor.g)}${toHex(dominantColor.b)}`;
}