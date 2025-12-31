import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// --- Configuration Constants ---
const DECAY_FACTOR = 0.05;
const ROTATION_SPEED_AZIMUTHAL = 0.01;
const ROTATION_SPEED_POLAR = 0.008;
const MAX_AZIMUTHAL_ROTATION = 0.25;
const MAX_POLAR_ROTATION = 0.08;

function createUIOverlays(container) {
    // --- 1. Base Configuration ---
    const ARROW_FONT_SIZE = '20px';
    
    // Extract the integer value (e.g., 24) to perform math
    const baseSize = parseInt(ARROW_FONT_SIZE, 10); 

    // --- 2. Derived Constants (Scalable) ---
    // We use multipliers to define the relationship between font size and button size.
    
    // 1.7x the font size creates a comfortable button radius around the text
    const RADIUS_VAL = baseSize * 3; 
    const BUTTON_RADIUS = `${RADIUS_VAL}px`;
    
    // Diameter is always 2x Radius
    const BUTTON_DIAMETER = `${RADIUS_VAL * 2}px`;
    
    // Zone is roughly 4x the font size (wide area to catch the mouse)
    const EDGE_ZONE_WIDTH = `${baseSize * 4.2}px`;
    
    // The optical offset is about 40% of the font size
    const OPTICAL_OFFSET = `${baseSize * 0.4}px`;


    // --- 3. Main Wrapper ---
    const wrapper = document.createElement('div');
    Object.assign(wrapper.style, {
        position: 'absolute',
        top: '0', left: '0',
        width: '100%', height: '100%',
        pointerEvents: 'none', 
        zIndex: '10',
        overflow: 'hidden'
    });

    // --- 4. Common Styles ---
    const commonZoneStyle = {
        position: 'absolute',
        zIndex: '11',
        pointerEvents: 'auto', 
        backgroundColor: 'transparent', 
    };

    const commonButtonStyle = {
        position: 'absolute',
        zIndex: '12',
        pointerEvents: 'auto',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        color: 'white',
        
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        
        fontFamily: 'sans-serif', 
        // Use the constant directly
        fontSize: ARROW_FONT_SIZE, 
        fontWeight: 'bold',
        lineHeight: '1',
        boxSizing: 'border-box', 

        backdropFilter: 'blur(4px)',
        cursor: 'pointer',
        
        opacity: '0', 
        transform: 'scale(0.8)',
        transition: 'opacity 0.3s ease, transform 0.3s ease, background-color 0.2s'
    };

    // Helper to create elements
    const createElements = (id, arrow, zoneStyle, btnStyle) => {
        const zone = document.createElement('div');
        zone.id = `zone-${id}`;
        Object.assign(zone.style, commonZoneStyle, zoneStyle);

        const btn = document.createElement('div');
        btn.id = `btn-${id}`;
        btn.innerHTML = arrow;
        Object.assign(btn.style, commonButtonStyle, btnStyle);

        // --- Hover Logic ---
        zone.addEventListener('mouseenter', () => {
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1)';
        });
        zone.addEventListener('mouseleave', () => {
            btn.style.opacity = '0';
            btn.style.transform = 'scale(0.8)';
        });
        btn.addEventListener('mouseenter', () => {
            btn.style.opacity = '1';
            btn.style.transform = 'scale(1)';
            btn.style.backgroundColor = 'rgba(255, 255, 255, 0.4)'; 
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
        });

        wrapper.appendChild(zone);
        wrapper.appendChild(btn);

        return { zone, btn };
    };

    // --- 5. Create Directional Controls (Using Derived Constants) ---

    const left = createElements('left', '&#8592;', 
        { top: '0', left: '0', width: EDGE_ZONE_WIDTH, height: '100%' },
        { 
            top: '50%', left: '0', 
            marginTop: `-${BUTTON_RADIUS}`, // Center vertically
            width: BUTTON_RADIUS, height: BUTTON_DIAMETER, 
            borderRadius: `0 ${BUTTON_DIAMETER} ${BUTTON_DIAMETER} 0`,
            paddingRight: OPTICAL_OFFSET 
        }
    );

    const right = createElements('right', '&#8594;', 
        { top: '0', right: '0', width: EDGE_ZONE_WIDTH, height: '100%' },
        { 
            top: '50%', right: '0', 
            marginTop: `-${BUTTON_RADIUS}`, 
            width: BUTTON_RADIUS, height: BUTTON_DIAMETER, 
            borderRadius: `${BUTTON_DIAMETER} 0 0 ${BUTTON_DIAMETER}`,
            paddingLeft: OPTICAL_OFFSET
        }
    );

    const top = createElements('top', '&#8593;', 
        { top: '0', left: '0', width: '100%', height: EDGE_ZONE_WIDTH },
        { 
            top: '0', left: '50%', 
            marginLeft: `-${BUTTON_RADIUS}`, // Center horizontally
            width: BUTTON_DIAMETER, height: BUTTON_RADIUS, 
            borderRadius: `0 0 ${BUTTON_DIAMETER} ${BUTTON_DIAMETER}`,
            paddingBottom: OPTICAL_OFFSET
        }
    );

    const bottom = createElements('bottom', '&#8595;', 
        { bottom: '0', left: '0', width: '100%', height: EDGE_ZONE_WIDTH },
        { 
            bottom: '0', left: '50%', 
            marginLeft: `-${BUTTON_RADIUS}`, 
            width: BUTTON_DIAMETER, height: BUTTON_RADIUS, 
            borderRadius: `${BUTTON_DIAMETER} ${BUTTON_DIAMETER} 0 0`,
            paddingTop: OPTICAL_OFFSET
        }
    );

    container.appendChild(wrapper);

    return { left, right, top, bottom, wrapper };
}

/**
 * Main Controller Function
 */
export function setupOrbitControl(scene, camera, renderer, enableEdgeControl = false) {
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;

    // Internal State
    let totalAzimuthalRotation = 0;
    let totalPolarRotation = 0;
    
    // Movement flags (Only true when hovering the visible BUTTONS)
    const moveState = {
        left: false,
        right: false,
        up: false,
        down: false
    };

    let ui = null;
    let hideTimer = null;

    // --- Initialize Edge Controls ---
    if (enableEdgeControl) {
        const container = renderer.domElement.parentNode || document.body;
        ui = createUIOverlays(container);
        
        const allButtons = [ui.left.btn, ui.right.btn, ui.top.btn, ui.bottom.btn];
        const allZones = [ui.left.zone, ui.right.zone, ui.top.zone, ui.bottom.zone];
        // We treat buttons as interactables too, so hovering the button keeps the UI alive
        const allInteractables = [...allButtons, ...allZones];

        // 1. Logic to SHOW/HIDE all buttons together
        const showUI = () => {
            if (hideTimer) clearTimeout(hideTimer);
            allButtons.forEach(btn => {
                btn.style.opacity = '1';
                btn.style.transform = 'scale(1)';
            });
        };

        const hideUI = () => {
            // Small delay to prevent flickering when moving from Zone -> Button
            hideTimer = setTimeout(() => {
                allButtons.forEach(btn => {
                    btn.style.opacity = '0';
                    btn.style.transform = 'scale(0.8)';
                });
            }, 100);
        };

        allInteractables.forEach(el => {
            el.addEventListener('mouseenter', showUI);
            el.addEventListener('mouseleave', hideUI);
        });

        // 2. Logic to ACTIVATE Movement (Only on Buttons)
        const bindMovement = (btn, dir) => {
            btn.addEventListener('mouseenter', () => {
                moveState[dir] = true;
                btn.style.backgroundColor = 'rgba(255, 255, 255, 0.6)'; // Highlight
            });
            btn.addEventListener('mouseleave', () => {
                moveState[dir] = false;
                btn.style.backgroundColor = 'rgba(255, 255, 255, 0.2)'; // Reset
            });
        };

        bindMovement(ui.left.btn, 'left');
        bindMovement(ui.right.btn, 'right');
        bindMovement(ui.top.btn, 'up');
        bindMovement(ui.bottom.btn, 'down');
    }

    // --- Update Loop ---
    controls.edgeControlUpdate = () => {
        // Standard update
        if (!enableEdgeControl) {
            controls.update();
            return;
        }

        let azimuthalDelta = 0;
        let polarDelta = 0;

        // Determine movement based on hover state
        if (moveState.left) azimuthalDelta = -ROTATION_SPEED_AZIMUTHAL;
        if (moveState.right) azimuthalDelta = ROTATION_SPEED_AZIMUTHAL;
        if (moveState.up) polarDelta = -ROTATION_SPEED_POLAR;
        if (moveState.down) polarDelta = ROTATION_SPEED_POLAR;

        // --- Physics: Azimuthal (Horizontal) ---
        if (azimuthalDelta !== 0) {
            // Check Limit
            const futureTotal = totalAzimuthalRotation + azimuthalDelta;
            if (Math.abs(futureTotal) > MAX_AZIMUTHAL_ROTATION) {
                // Clamp to max
                azimuthalDelta = Math.sign(futureTotal) * MAX_AZIMUTHAL_ROTATION - totalAzimuthalRotation;
            }
            totalAzimuthalRotation += azimuthalDelta;
        } else {
            // Auto-Return (Decay)
            if (Math.abs(totalAzimuthalRotation) > 0.001) {
                const decay = totalAzimuthalRotation * DECAY_FACTOR;
                azimuthalDelta = -decay;
                totalAzimuthalRotation += azimuthalDelta;
            } else {
                totalAzimuthalRotation = 0;
            }
        }

        // --- Physics: Polar (Vertical) ---
        if (polarDelta !== 0) {
            // Check Limit
            const futureTotal = totalPolarRotation + polarDelta;
            if (Math.abs(futureTotal) > MAX_POLAR_ROTATION) {
                // Clamp to max
                polarDelta = Math.sign(futureTotal) * MAX_POLAR_ROTATION - totalPolarRotation;
            }
            totalPolarRotation += polarDelta;
        } else {
            // Auto-Return (Decay)
            if (Math.abs(totalPolarRotation) > 0.001) {
                const decay = totalPolarRotation * DECAY_FACTOR;
                polarDelta = -decay;
                totalPolarRotation += polarDelta;
            } else {
                totalPolarRotation = 0;
            }
        }

        // --- Apply Matrix Transformations ---
        if (azimuthalDelta !== 0) {
            const rotationMatrix = new THREE.Matrix4().makeRotationY(azimuthalDelta);
            controls.object.position.sub(controls.target)
                .applyMatrix4(rotationMatrix)
                .add(controls.target);
        }

        if (polarDelta !== 0) {
            const rotationAxis = new THREE.Vector3().crossVectors(
                controls.object.up,
                controls.object.position.clone().sub(controls.target)
            ).normalize();
            const rotationMatrix = new THREE.Matrix4().makeRotationAxis(rotationAxis, polarDelta);
            controls.object.position.sub(controls.target)
                .applyMatrix4(rotationMatrix)
                .add(controls.target);
        }

        controls.update();
    };

    // --- Cleanup ---
    const originalDispose = controls.dispose;
    controls.dispose = () => {
        if (ui && ui.wrapper) {
            ui.wrapper.remove();
        }
        originalDispose.call(controls);
    };

    controls.update();
    return controls;
}