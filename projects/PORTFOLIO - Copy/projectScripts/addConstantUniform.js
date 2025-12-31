import * as THREE from 'three';
import { gltfLoader,textureLoader,rgbeLoader } from '../configs/setupLoaders.js'
const blankTexture = textureLoader.load('./textures/blank2.png');
const fireFliesTexture = textureLoader.load('./textures/spark1.png')

export const constantUniform =     {
        iTime: { value: 0.1 },
        iResolution: {value: new THREE.Vector2(window.screen.width * window.devicePixelRatio,window.screen.height * window.devicePixelRatio ) },
        glowColor: {value: new THREE.Color("red")},
        scaleFactor : {value:1.7},
        iChannelX: { value: blankTexture },
        moonLightYs: {value: new THREE.Vector2(0.0, 0.1)},
        alpha: {value:1.0},
        nebulaCoreRadius: {value: 20.0}, // Adjust this value to control the core radius of the nebula
        nebulaTwistFactor: {value: 0.0}, // Adjust this value to control the twistiness of the nebula
        isStriking: {value: false},
        isRaining: {value: true},
        normalizedStrikePosX: {value: -2.},
        normalizedStrikePosY: {value: -2.},
        normalizedStrikePos: {value: new THREE.Vector2(-2., -2.)},
        // normalizedStrikePosY: {value: -2.},
        strikeWhiteCoreWidth: {value: 0.001},  // 0.0006 - 0.002 recommended
        fireFliesTexture: { value: fireFliesTexture },
        rainGlassOpacity: { value: 1. },
        glassRainAmount : { value: 1.},
        hasRimOnGlass: {value: true},
        uRainHeaviness: { value: 2.},
        uRainOffset: { value: 0.0 },
        uRimCenter: { value: new THREE.Vector2(-0.5, 0.5) }

};

export function addConstantUniform(scene){
    scene.constantUniform = constantUniform;
}


export class ConstantUniformsCustomizer {
    /**
     * @param {THREE.Scene} scene The Three.js scene object.
     */
    constructor(scene) {
        this.scene = scene;

        // --- Main Panel Style ---
        const panel = document.createElement('div');
        Object.assign(panel.style, {
            position: 'fixed',
            left: '10px',
            top: '10px',
            background: 'white',
            color: 'black',
            padding: '0',
            borderRadius: '5px',
            fontFamily: 'monospace',
            fontSize: '12px',
            zIndex: '1000',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'block',
            minWidth: '280px',
            userSelect: 'none'
        });

        // --- Header Style ---
        const head = document.createElement('div');
        Object.assign(head.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            background: '#eee',
            padding: '6px 10px',
            borderTopLeftRadius: '5px',
            borderTopRightRadius: '5px',
            cursor: 'pointer',
            letterSpacing: '1px'
        });

        const title = document.createElement('span');
        title.textContent = 'Constant Uniform Customizer';

        const chevron = document.createElement('span');
        chevron.innerHTML = '&#x25BC;'; // Down arrow
        chevron.style.transition = 'transform 0.2s';

        head.appendChild(title);
        head.appendChild(chevron);

        // --- Body Style ---
        const body = document.createElement('div');
        Object.assign(body.style, {
            padding: '8px 10px 10px 10px',
            transition: 'max-height 0.2s',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
        });
        this.body = body;

        // --- Refresh Button ---
        const refreshButton = document.createElement('button');
        refreshButton.textContent = 'Refresh Uniforms';
        Object.assign(refreshButton.style, {
            padding: '6px 14px',
            background: '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontWeight: 'bold',
            fontSize: '12px',
            cursor: 'pointer',
            transition: 'background 0.2s',
            marginBottom: '4px'
        });
        refreshButton.onclick = () => this.populateUniforms();
        
        body.appendChild(refreshButton);

        // --- Add to document ---
        panel.appendChild(head);
        panel.appendChild(body);
        document.body.appendChild(panel);

        // Initial population of uniforms
        this.populateUniforms();

        // --- Panel Drag and Collapse Logic ---
        this.makeDraggableAndCollapsible(panel, head, body, chevron);
    }

    /**
     * Clears and rebuilds the UI controls based on the current scene.constantUniform.
     */
    populateUniforms() {
        // Clear old controls, but keep the refresh button
        while (this.body.children.length > 1) {
            this.body.removeChild(this.body.lastChild);
        }

        if (!this.scene.constantUniform) {
            const message = document.createElement('div');
            message.textContent = 'scene.constantUniform does not exist.';
            message.style.color = '#d32f2f';
            this.body.appendChild(message);
            return;
        }

        const uniforms = this.scene.constantUniform;
        const keys = Object.keys(uniforms);

        if (keys.length === 0) {
            const message = document.createElement('div');
            message.textContent = 'No constant uniforms found.';
            this.body.appendChild(message);
            return;
        }

        // Create controls for each uniform
        for (const key of keys) {
            const uniform = uniforms[key];
            const value = uniform.value;
            let control;

            if (value instanceof THREE.Color) {
                control = this.createColorControl(key, value, (newVal) => {
                    uniform.value.set(newVal);
                });
            } else if (value instanceof THREE.Vector4 || value instanceof THREE.Vector3 || value instanceof THREE.Vector2) {
                const components = (value instanceof THREE.Vector4) ? ['x', 'y', 'z', 'w'] : (value instanceof THREE.Vector3) ? ['x', 'y', 'z'] : ['x', 'y'];
                control = this.createVectorControl(key, value, components, () => { /* Value is updated directly by reference */ });
            } else if (typeof value === 'number') {
                control = this.createNumberControl(key, value, (newVal) => {
                    uniform.value = newVal;
                }, { min: -10, max: 10, step: 0.01 }); // Example range, adjust as needed
            } else if (typeof value === 'boolean') {
                control = this.createCheckboxControl(key, value, (newVal) => {
                    uniform.value = newVal;
                });
            } else {
                // Handle unsupported types by displaying them as read-only
                control = document.createElement('div');
                control.innerHTML = `<span>${key}:</span> <span style="color:#888;">(Unsupported Type)</span>`;
            }
            
            if (control) {
                this.body.appendChild(control);
            }
        }
    }

    /**
     * Helper to create a control for a vector (Vector2, Vector3, Vector4).
     * @param {string} label The name of the uniform.
     * @param {THREE.Vector2|THREE.Vector3|THREE.Vector4} vector The vector object.
     * @param {string[]} components An array of component names (e.g., ['x', 'y']).
     * @param {function} onChange Callback function when the value changes.
     * @returns {HTMLDivElement} The control row element.
     */
    createVectorControl(label, vector, components, onChange) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';

        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;
        labelSpan.style.fontWeight = '500';
        labelSpan.style.width = '120px';

        const inputBox = document.createElement('div');
        inputBox.style.display = 'flex';
        inputBox.style.gap = '8px';

        components.forEach(axis => {
            const input = document.createElement('input');
            input.type = 'number';
            input.value = vector[axis].toFixed(3);
            input.step = 0.01;
            input.style.width = '50px';
            input.style.fontFamily = 'monospace';
            input.style.fontSize = '12px';
            input.style.padding = '2px 4px';
            input.style.border = '1px solid #bbb';
            input.style.borderRadius = '3px';
            input.oninput = () => {
                let val = parseFloat(input.value);
                if (isNaN(val)) val = 0;
                vector[axis] = val;
                if (onChange) onChange();
            };
            inputBox.appendChild(input);
        });

        row.appendChild(labelSpan);
        row.appendChild(inputBox);
        return row;
    }
    
    /**
     * Helper to create a color picker control.
     * @param {string} label The name of the uniform.
     * @param {THREE.Color} color The color object.
     * @param {function} onChange Callback function.
     * @returns {HTMLDivElement} The control row element.
     */
    createColorControl(label, color, onChange) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';

        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;
        labelSpan.style.width = '120px';
        labelSpan.style.fontWeight = '500';
        
        const input = document.createElement('input');
        input.type = 'color';
        input.value = '#' + color.getHexString();
        input.style.border = '1px solid #bbb';
        input.style.padding = '0';
        input.style.height = '24px';
        input.oninput = () => onChange(input.value);

        row.appendChild(labelSpan);
        row.appendChild(input);
        return row;
    }

    /**
     * Helper to create a number/range slider control.
     * @param {string} label The name of the uniform.
     * @param {number} value The initial number value.
     * @param {function} onChange Callback function.
     * @param {object} options Options for min, max, and step.
     * @returns {HTMLDivElement} The control row element.
     */
    createNumberControl(label, value, onChange, options) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';

        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;
        labelSpan.style.width = '120px';
        labelSpan.style.fontWeight = '500';

        const rangeInput = document.createElement('input');
        rangeInput.type = 'range';
        rangeInput.min = options?.min ?? 0;
        rangeInput.max = options?.max ?? 1;
        rangeInput.step = options?.step ?? 0.01;
        rangeInput.value = value;
        rangeInput.style.flex = '1';

        const numberInput = document.createElement('input');
        numberInput.type = 'number';
        numberInput.min = rangeInput.min;
        numberInput.max = rangeInput.max;
        numberInput.step = rangeInput.step;
        numberInput.value = value;
        numberInput.style.width = '60px';
        numberInput.style.border = '1px solid #bbb';
        numberInput.style.borderRadius = '3px';
        numberInput.style.padding = '2px 4px';

        rangeInput.oninput = () => {
            const val = parseFloat(rangeInput.value);
            numberInput.value = val.toFixed(3);
            onChange(val);
        };
        numberInput.oninput = () => {
            const val = parseFloat(numberInput.value);
            rangeInput.value = val;
            onChange(val);
        };

        row.appendChild(labelSpan);
        row.appendChild(rangeInput);
        row.appendChild(numberInput);
        return row;
    }

    /**
     * Helper to create a checkbox control.
     * @param {string} label The name of the uniform.
     * @param {boolean} value The initial boolean value.
     * @param {function} onChange Callback function.
     * @returns {HTMLDivElement} The control row element.
     */
    createCheckboxControl(label, value, onChange) {
        const row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '8px';

        const labelSpan = document.createElement('label');
        labelSpan.textContent = label;
        labelSpan.style.width = '120px';
        labelSpan.style.fontWeight = '500';
        labelSpan.htmlFor = `checkbox-${label}`;
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.checked = !!value;
        input.id = `checkbox-${label}`;
        input.onchange = () => onChange(input.checked);

        row.appendChild(labelSpan);
        row.appendChild(input);
        return row;
    }

    /**
     * Encapsulates the logic for making the panel draggable and collapsible.
     * @param {HTMLDivElement} panel The main panel element.
     * @param {HTMLDivElement} head The header element that acts as the drag handle.
     * @param {HTMLDivElement} body The body element to collapse/expand.
     * @param {HTMLSpanElement} chevron The arrow indicator.
     */
    makeDraggableAndCollapsible(panel, head, body, chevron) {
        let isDragging = false;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        let dragMoved = false;

        head.style.cursor = 'move';

        head.addEventListener('mousedown', (e) => {
            isDragging = true;
            dragMoved = false;
            const rect = panel.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            document.body.style.userSelect = 'none'; // Prevent text selection while dragging
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            dragMoved = true;
            panel.style.left = (e.clientX - dragOffsetX) + 'px';
            panel.style.top = (e.clientY - dragOffsetY) + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                document.body.style.userSelect = '';
                // Use a timeout to prevent the click event from firing immediately after a drag
                setTimeout(() => { dragMoved = false; }, 0);
            }
        });

        // Collapse/expand logic, which ignores the click if it was part of a drag
        let collapsed = false;
        head.addEventListener('click', () => {
            if (dragMoved) return;
            collapsed = !collapsed;
            body.style.display = collapsed ? 'none' : 'flex';
            chevron.innerHTML = collapsed ? '&#x25B2;' : '&#x25BC;'; // Up/Down arrow
        });
    }
}
