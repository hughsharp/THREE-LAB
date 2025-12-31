/**
 * Finds an object by its name in the scene and applies a physics impulse to its Rapier body.
 * This function can be used internally or exported for programmatic use.
 *
 * @param {THREE.Scene} scene The Three.js scene to search within.
 * @param {string} objectName The name of the object to find (case-sensitive).
 * @param {{x: number, y: number, z: number}} [force={ x: 0, y: 10, z: 0 }] - The impulse vector to apply.
 */
export function applyForceByName(scene, objectName, force = { x: 0, y: 10, z: 0 }) {
    console.log(`[Debug] applyForceByName: Searching for object named "${objectName}".`);

    if (!objectName) {
        console.warn("[Debug] applyForceByName: Input for object name was empty. Aborting.");
        return;
    }

    const foundObject = scene.getObjectByName(objectName);

    if (foundObject ) {
        console.log(`[Debug] applyForceByName: Object "${objectName}" found!`, foundObject);
        const rapierBody = foundObject.rapierBody;

        if (rapierBody) {
            console.log(`[Debug] applyForceByName: Found rapierBody. Applying impulse.`, rapierBody);
            rapierBody.applyImpulse(force, true);
            console.log(`[Debug] applyForceByName: Successfully applied force to ${objectName}'s rapier body.`);
        } else {
            console.error(`[Debug] applyForceByName: ERROR! Object "${objectName}" was found, but it has no associated 'rapierBody' property.`);
        }
    } else {
        console.error(`[Debug] applyForceByName: ERROR! An object with the name "${objectName}" was not found in the scene.`);
    }
}

/**
 * Creates the UI, injects it into the DOM, and wires up all event listeners.
 * This is now the primary function to be called from your main script.
 * @param {THREE.Scene} scene - The Three.js scene instance. The UI needs this to interact with objects.
 * @param {HTMLElement} [container=document.body] - The parent element to append the UI to.
 */
export function createForceInterface(scene, container = document.body) {
    console.log("[Debug] createForceInterface: Function called. Creating UI...");

    if (!scene || !scene.isScene) {
        console.error("[Debug] createForceInterface: ERROR! The provided 'scene' is not a valid THREE.Scene object. UI will not work.", scene);
        return;
    }

    // --- 1. Create the UI Elements ---
    const uiContainer = document.createElement('div');
    uiContainer.id = 'ui-container';
    uiContainer.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2 p-4 bg-gray-800/80 rounded-lg shadow-lg backdrop-blur-sm z-10';

    const inputField = document.createElement('input');
    inputField.type = 'text';
    inputField.id = 'object-name-input';
    inputField.placeholder = 'Enter object name...';
    inputField.className = 'bg-gray-700 border border-gray-600 text-gray-100 rounded-md px-4 py-2 outline-none focus:border-blue-500 transition-colors';

    const applyButton = document.createElement('button');
    applyButton.id = 'apply-force-btn';
    applyButton.textContent = 'Apply Force';
    applyButton.className = 'bg-blue-600 text-white font-semibold border-none rounded-md px-6 py-2 cursor-pointer hover:bg-blue-700 transition-colors';

    // --- 2. Assemble and Inject the UI ---
    uiContainer.appendChild(inputField);
    uiContainer.appendChild(applyButton);
    container.appendChild(uiContainer);
    console.log("[Debug] createForceInterface: UI has been created and added to the page.");

    // --- 3. Define Handler and Attach Event Listeners (The "Glue") ---
    const handleApplyForce = () => {
        console.log("[Debug] handleApplyForce: Button clicked or Enter pressed!");
        const objectName = inputField.value.trim();
        const forceToApply = { x: 1000, y: 15, z: 500 };
        
        applyForceByName(scene, objectName, forceToApply);
        
        inputField.value = '';
        inputField.focus();
    };

    applyButton.addEventListener('click', handleApplyForce);
    inputField.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            handleApplyForce();
        }
    });
    console.log("[Debug] createForceInterface: Event listeners have been attached to the button and input field.");
}
